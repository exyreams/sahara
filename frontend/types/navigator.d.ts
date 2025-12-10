// Fix for Solana wallet adapter HID type issue
interface Navigator {
  hid?: {
    requestDevice(options?: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
    getDevices(): Promise<HIDDevice[]>;
  };
}

interface HIDDeviceRequestOptions {
  filters?: HIDDeviceFilter[];
}

interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

interface HIDDevice {
  vendorId: number;
  productId: number;
  productName: string;
  collections: HIDCollectionInfo[];
  opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: BufferSource): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
}

interface HIDCollectionInfo {
  usage: number;
  usagePage: number;
  reportIds: number[];
  inputReports: HIDReportInfo[];
  outputReports: HIDReportInfo[];
  featureReports: HIDReportInfo[];
}

interface HIDReportInfo {
  reportId: number;
  items: HIDReportItem[];
}

interface HIDReportItem {
  isAbsolute: boolean;
  isArray: boolean;
  isBufferedBytes: boolean;
  isConstant: boolean;
  isLinear: boolean;
  isRange: boolean;
  isVolatile: boolean;
  hasNull: boolean;
  hasPreferredState: boolean;
  wrap: boolean;
  usage: number;
  usagePage: number;
  reportSize: number;
  reportCount: number;
  unitExponent: number;
  unitSystem: number;
  unitFactorLengthExponent: number;
  unitFactorMassExponent: number;
  unitFactorTimeExponent: number;
  unitFactorTemperatureExponent: number;
  unitFactorCurrentExponent: number;
  unitFactorLuminousIntensityExponent: number;
  logicalMinimum: number;
  logicalMaximum: number;
  physicalMinimum: number;
  physicalMaximum: number;
  strings: string[];
}