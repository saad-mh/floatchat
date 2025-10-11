import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 py-8 px-4 relative">
            {/* Theme toggle in top-right corner */}
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href="/auth">
                        <Button variant="ghost" size="sm" className="mb-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Sign Up
                        </Button>
                    </Link>
                </div>

                <Card className="shadow-xl border-0">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold text-center">Terms of Service</CardTitle>
                        <p className="text-center text-muted-foreground">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </CardHeader>
                    <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                By accessing and using FloatChat, you accept and agree to be bound by the terms and provision of this agreement.
                                If you do not agree to abide by the above, please do not use this service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                FloatChat is a conversational interface for accessing and analyzing Argo ocean float data. The service provides
                                users with the ability to query oceanographic data through natural language processing and receive visualizations
                                and insights about ocean conditions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
                            <div className="space-y-2">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • You are responsible for maintaining the confidentiality of your account credentials
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • You must provide accurate and complete information when creating an account
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • You are responsible for all activities that occur under your account
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • You must notify us immediately of any unauthorized use of your account
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">4. Data Usage and Privacy</h2>
                            <div className="space-y-2">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • The oceanographic data provided through FloatChat is sourced from publicly available Argo float datasets
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Your queries and interactions with the service may be logged for improvement purposes
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • We do not sell or share your personal data with third parties
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • For detailed information about data handling, please refer to our Privacy Policy
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
                            <div className="space-y-2">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    You agree not to:
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Use the service for any unlawful purpose or to solicit others to perform unlawful acts
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Attempt to gain unauthorized access to the service or its related systems
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Use the service to transmit any malicious code or harmful content
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Overload or attempt to disable the service through excessive requests
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                The service and its original content, features, and functionality are and will remain the exclusive property
                                of FloatChat and its licensors. The service is protected by copyright, trademark, and other laws.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">7. Disclaimer of Warranties</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                The information, software, products, and services included in or available through the service may include
                                inaccuracies or typographical errors. Changes are periodically added to the information herein. FloatChat
                                may make improvements and/or changes in the service at any time.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                In no event shall FloatChat, nor its directors, employees, partners, agents, suppliers, or affiliates, be
                                liable for any indirect, incidental, punitive, consequential, or similar damages arising out of or in
                                connection with your use of the service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">9. Modifications to Terms</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                We reserve the right to modify these terms at any time. If we make material changes to these terms, we will
                                notify you through the service or by other means. Your continued use of the service after such modifications
                                will constitute acknowledgment and agreement of the modified terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                If you have any questions about these Terms of Service, please contact us at:
                            </p>
                            <div className="bg-muted/50 p-4 rounded-lg mt-2">
                                <p className="text-sm font-medium">Email: support@floatchat.com</p>
                                <p className="text-sm text-muted-foreground">We typically respond within 24-48 hours</p>
                            </div>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}