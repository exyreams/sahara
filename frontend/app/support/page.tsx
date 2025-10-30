"use client";

import { Mail, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success("Support request submitted successfully!", {
      description: "We'll get back to you within 24-48 hours.",
    });

    // Reset form
    setFormData({
      name: "",
      email: "",
      category: "",
      subject: "",
      message: "",
    });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-theme-bg">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-theme-text-highlight mb-4">
              Support Center
            </h1>
            <p className="text-lg text-theme-text">
              Have questions or need help? We're here to assist you.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {/* Quick Contact Cards */}
            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <Mail className="h-8 w-8 text-theme-primary mb-2" />
                <CardTitle className="text-lg">Email Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-theme-text mb-2">
                  For general inquiries
                </p>
                <a
                  href="mailto:support@sahara.com"
                  className="text-sm text-theme-primary hover:underline"
                >
                  support@sahara.com
                </a>
              </CardContent>
            </Card>

            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <MessageSquare className="h-8 w-8 text-theme-primary mb-2" />
                <CardTitle className="text-lg">Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-theme-text mb-2">Join our Discord</p>
                <a
                  href="https://github.com/exyreams/sahara"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-theme-primary hover:underline"
                >
                  Join Discord
                </a>
              </CardContent>
            </Card>

            <Card className="bg-theme-card-bg border-theme-border">
              <CardHeader>
                <Send className="h-8 w-8 text-theme-primary mb-2" />
                <CardTitle className="text-lg">GitHub</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-theme-text mb-2">
                  Report issues or contribute
                </p>
                <a
                  href="https://github.com/exyreams/sahara"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-theme-primary hover:underline"
                >
                  View Repository
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Support Form */}
          <Card className="bg-theme-card-bg border-theme-border">
            <CardHeader>
              <CardTitle>Submit a Support Request</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as
                possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="technical">
                        Technical Support
                      </SelectItem>
                      <SelectItem value="ngo">NGO Partnership</SelectItem>
                      <SelectItem value="donation">Donation Issues</SelectItem>
                      <SelectItem value="beneficiary">
                        Beneficiary Support
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Please provide as much detail as possible..."
                    rows={6}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="mt-8 bg-theme-card-bg border-theme-border">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-theme-text-highlight mb-2">
                  How do I donate to a beneficiary?
                </h4>
                <p className="text-sm text-theme-text">
                  Connect your Solana wallet, browse verified beneficiaries, and
                  click the "Donate" button. You can donate USDC or SOL
                  directly.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-theme-text-highlight mb-2">
                  How are beneficiaries verified?
                </h4>
                <p className="text-sm text-theme-text">
                  Beneficiaries are verified through a multi-signature process
                  by multiple field workers from different NGOs to ensure
                  legitimacy.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-theme-text-highlight mb-2">
                  What are the platform fees?
                </h4>
                <p className="text-sm text-theme-text">
                  A small percentage fee is collected to maintain the platform
                  and cover infrastructure costs. This is significantly lower
                  than traditional relief organizations.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-theme-text-highlight mb-2">
                  How can my NGO join the platform?
                </h4>
                <p className="text-sm text-theme-text">
                  NGOs can register through the platform. After registration, an
                  admin will review and verify your organization before granting
                  access.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
