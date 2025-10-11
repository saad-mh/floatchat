import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
                        <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
                        <p className="text-center text-muted-foreground">
                            Last updated: {new Date().toLocaleDateString()}
                        </p>
                    </CardHeader>
                    <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-lg font-medium mb-2">Personal Information</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        When you create an account with FloatChat, we collect:
                                    </p>
                                    <div className="space-y-1 mt-2">
                                        <p className="text-sm leading-relaxed text-muted-foreground">• Name and email address</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground">• Password (encrypted and securely stored)</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground">• Profile information (if provided)</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-medium mb-2">Usage Information</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        We automatically collect information about how you use our service:
                                    </p>
                                    <div className="space-y-1 mt-2">
                                        <p className="text-sm leading-relaxed text-muted-foreground">• Queries and interactions with the chat interface</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground">• Time and date of service usage</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground">• Device and browser information</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground">• IP address and general location data</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
                            <div className="space-y-2">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    We use the collected information for the following purposes:
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • To provide, maintain, and improve our services
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • To personalize your experience with FloatChat
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • To communicate with you about service updates and support
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • To analyze usage patterns and improve our algorithms
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • To detect and prevent fraud or abuse
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
                            <div className="space-y-3">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                                </p>
                                <div className="space-y-2">
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        • <strong>Service Providers:</strong> We may share information with trusted third-party service providers who help us operate our service
                                    </p>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        • <strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests
                                    </p>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        • <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">4. Google OAuth Integration</h2>
                            <div className="space-y-2">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    When you choose to sign in with Google:
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • We receive basic profile information (name, email, profile picture) from Google
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • This information is stored in our PostgreSQL database alongside other user data
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • We follow the same privacy protections for Google OAuth users as for direct signups
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • You can revoke Google access permissions at any time through your Google account settings
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
                            <div className="space-y-2">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    We implement appropriate security measures to protect your information:
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Passwords are hashed using Argon2 encryption
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Data is stored securely in encrypted databases
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • We use HTTPS encryption for all data transmission
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Regular security audits and updates are performed
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                We retain your personal information for as long as your account is active or as needed to provide services.
                                You may request deletion of your account and associated data at any time by contacting us. Some information
                                may be retained for legal or business purposes as required by law.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">7. Cookies and Tracking</h2>
                            <div className="space-y-2">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    We use cookies and similar technologies to:
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Maintain your login session
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Remember your preferences and settings
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Analyze service usage and performance
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Improve user experience and functionality
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
                            <div className="space-y-2">
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    You have the right to:
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Access and review your personal information
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Update or correct your information
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Delete your account and associated data
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Export your data in a portable format
                                </p>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    • Opt out of non-essential communications
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">9. Third-Party Services</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Our service may contain links to third-party websites or services. We are not responsible for the privacy
                                practices of these external sites. We encourage you to review the privacy policies of any third-party
                                services you access through our platform.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Our service is not intended for children under the age of 13. We do not knowingly collect personal
                                information from children under 13. If you are a parent or guardian and believe your child has provided
                                us with personal information, please contact us to have it removed.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">11. International Data Transfers</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Your information may be transferred to and processed in countries other than your own. We ensure that
                                such transfers comply with applicable data protection laws and implement appropriate safeguards to
                                protect your information.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">12. Changes to This Policy</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                We may update this Privacy Policy from time to time. We will notify you of any material changes by
                                posting the new policy on this page and updating the "Last updated" date. Your continued use of the
                                service after such changes constitutes acceptance of the updated policy.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                If you have any questions about this Privacy Policy or our data practices, please contact us:
                            </p>
                            <div className="bg-muted/50 p-4 rounded-lg mt-2">
                                <p className="text-sm font-medium">Email: privacy@floatchat.com</p>
                                <p className="text-sm text-muted-foreground">Data Protection Officer: dpo@floatchat.com</p>
                                <p className="text-sm text-muted-foreground">We typically respond within 24-48 hours</p>
                            </div>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}