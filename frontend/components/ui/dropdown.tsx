import { AnimatePresence, motion, stagger } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

type DropdownPosition = "top" | "bottom";

interface SelectContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedValue: string | undefined;
  setSelectedValue: (value: string, label: React.ReactNode) => void;
  selectedLabel: React.ReactNode;
  placeholder?: string;
  contentPosition: DropdownPosition;
  triggerRect: DOMRect | null;
}

const SelectContext = createContext<SelectContextType | null>(null);

const useSelectContext = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error(
      "Select components must be used within a <Select> provider",
    );
  }
  return context;
};

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

const Select = ({
  children,
  value,
  onValueChange,
  placeholder,
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{
    value?: string;
    label: React.ReactNode;
  }>({
    value: value,
    label: placeholder,
  });
  const [contentPosition, setContentPosition] =
    useState<DropdownPosition>("bottom");
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

  const selectRef = useRef<HTMLDivElement>(null);

  const setSelectedValue = useCallback(
    (newValue: string, newLabel: React.ReactNode) => {
      onValueChange?.(newValue);
      setSelectedOption({ value: newValue, label: newLabel });
      setIsOpen(false);
    },
    [onValueChange],
  );

  const findLabel = useCallback(
    (nodes: React.ReactNode, targetValue: string): React.ReactNode => {
      let foundLabel: React.ReactNode = null;

      const searchInChildren = (children: React.ReactNode): React.ReactNode => {
        React.Children.forEach(children, (child) => {
          if (foundLabel) return; // Early exit if already found

          if (React.isValidElement(child) && child.props) {
            const props = child.props as {
              value?: string;
              children?: React.ReactNode;
            };

            if (props.value === targetValue) {
              foundLabel = props.children;
            } else if (props.children) {
              const nestedLabel = searchInChildren(props.children);
              if (nestedLabel) foundLabel = nestedLabel;
            }
          }
        });
        return foundLabel;
      };

      return searchInChildren(nodes);
    },
    [],
  );

  useEffect(() => {
    if (value !== undefined) {
      const label = findLabel(children, value) || placeholder;
      setSelectedOption({ value, label });
    }
  }, [value, children, placeholder, findLabel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Calculate position and trigger rect for portal
  useEffect(() => {
    if (!isOpen) return;

    const calculatePosition = () => {
      if (selectRef.current) {
        const triggerEl = selectRef.current.querySelector("button");
        if (!triggerEl) return;

        const rect = triggerEl.getBoundingClientRect();
        setTriggerRect(rect);

        const viewportHeight = window.innerHeight;
        const contentHeightEstimate = 240;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (
          spaceBelow < contentHeightEstimate &&
          spaceAbove > contentHeightEstimate
        ) {
          setContentPosition("top");
        } else {
          setContentPosition("bottom");
        }
      }
    };

    calculatePosition();
    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);

    return () => {
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [isOpen]);

  const contextValue = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      selectedValue: value,
      setSelectedValue,
      selectedLabel: selectedOption.label,
      placeholder,
      contentPosition,
      triggerRect,
    }),
    [
      isOpen,
      value,
      setSelectedValue,
      selectedOption.label,
      placeholder,
      contentPosition,
      triggerRect,
    ],
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative" ref={selectRef}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen } = useSelectContext();
  const { currentTheme } = useTheme();
  const _isDark = currentTheme !== "light";

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "w-full rounded-lg px-3 py-2 text-sm focus:border-theme-primary focus:ring-1 focus:ring-theme-primary focus:outline-hidden cursor-pointer transition-all duration-200 hover:border-theme-primary/50 flex items-center justify-between backdrop-blur-sm",
        "bg-theme-card-bg border border-theme-border text-theme-text hover:text-theme-text-highlight",
        className,
      )}
      onClick={() => setIsOpen(!isOpen)}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      {...props}
    >
      {children}
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.8,
        }}
      >
        <ChevronDown className="h-4 w-4 text-theme-text" />
      </motion.div>
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { selectedLabel, placeholder: contextPlaceholder } = useSelectContext();
  const displayLabel = selectedLabel || placeholder || contextPlaceholder;

  return (
    <span
      className={cn(
        !selectedLabel && "text-theme-text/60",
        selectedLabel && "text-theme-text-highlight",
      )}
    >
      {displayLabel}
    </span>
  );
};
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children: React.ReactNode;
  }
>(({ className, children }, ref) => {
  const { isOpen, contentPosition, triggerRect } = useSelectContext();

  const animationVariants = useMemo(
    () => ({
      initial: {
        opacity: 0,
        y: contentPosition === "top" ? 8 : -8,
        scale: 0.92,
      },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: contentPosition === "top" ? 8 : -8, scale: 0.92 },
    }),
    [contentPosition],
  );

  // Calculate portal position styles
  const getPortalStyles = useMemo(() => {
    if (!triggerRect) return {};

    const styles: React.CSSProperties = {
      position: "fixed",
      left: triggerRect.left,
      width: triggerRect.width,
      zIndex: 9999, // Very high z-index to ensure it's on top
    };

    if (contentPosition === "top") {
      styles.bottom = window.innerHeight - triggerRect.top + 8;
    } else {
      styles.top = triggerRect.bottom + 8;
    }

    return styles;
  }, [triggerRect, contentPosition]);

  const content = (
    <AnimatePresence>
      {isOpen && triggerRect && (
        <motion.div
          ref={ref}
          role="listbox"
          initial={animationVariants.initial}
          animate={animationVariants.animate}
          exit={animationVariants.exit}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            mass: 0.8,
            duration: 0.3,
          }}
          style={getPortalStyles}
          className={cn(
            "max-h-60 min-w-32 overflow-y-auto rounded-lg shadow-xl backdrop-blur-md p-2",
            "border border-theme-border bg-theme-card-bg text-theme-text",
            "[&::-webkit-scrollbar]:w-2",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-theme-border",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:hover:bg-theme-primary/50",
            className,
          )}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  delayChildren: stagger(0.05, { startDelay: 0.08 }),
                },
              },
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render in portal to avoid z-index issues
  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : null;
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children: React.ReactNode;
    value: string;
    disabled?: boolean;
  }
>(({ className, children, value, disabled }, ref) => {
  const { selectedValue, setSelectedValue } = useSelectContext();
  const isSelected = selectedValue === value;

  return (
    <motion.div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      variants={{
        hidden: { opacity: 0, y: -4 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      onClick={() => !disabled && setSelectedValue(value, children)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg py-2.5 px-3 mb-1 text-sm outline-hidden border border-transparent transition-colors duration-200 ease-out",
        "text-theme-text hover:bg-theme-primary hover:text-theme-background",
        isSelected &&
          "bg-theme-primary/20 text-theme-text-highlight border-theme-primary/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
      <span className="flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              mass: 0.4,
              delay: 0.1,
            }}
          >
            <Check className="h-4 w-4" />
          </motion.div>
        )}
      </span>
    </motion.div>
  );
});
SelectItem.displayName = "SelectItem";

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  options: DropdownOption[];
  title?: string;
  disabled?: boolean;
}

export const Dropdown = React.memo(
  ({
    value,
    onValueChange,
    placeholder = "Select an option",
    className,
    options,
    title,
    disabled = false,
  }: DropdownProps) => {
    return (
      <div className={cn("space-y-2", className)}>
        {title && (
          <div className="text-sm font-medium text-theme-text">{title}</div>
        )}
        <Select
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
        >
          <SelectTrigger
            className={disabled ? "opacity-50 cursor-not-allowed" : ""}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  },
);

Dropdown.displayName = "Dropdown";
