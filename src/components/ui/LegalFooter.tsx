'use client';

import { useState } from 'react';
import { LegalModal } from './LegalModal';

type LegalDoc = 'terms' | 'privacy' | null;

const TermsContent = () => (
  <div className="text-white/70 text-sm leading-relaxed space-y-6">
    <p className="text-white/40 text-xs">Last updated: January 2026</p>
    
    <section className="space-y-2">
      <h3 className="text-white font-semibold">1. Acceptance of Terms</h3>
      <p>By accessing or using 67Ranked (&quot;67Ranked&quot;, the &quot;Game&quot;, or the &quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not access or use the Service.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">2. Description of Service</h3>
      <p>67Ranked is a browser-based, camera-powered game that measures fast hand movements in real time to generate scores across multiple challenge modes (including time-based and repetition-based formats). Scores may be ranked on public leaderboards and optionally shared by users.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">3. Accounts &amp; Access</h3>
      <p>You may use 67Ranked either anonymously, without creating an account, or with an account using supported authentication methods (such as email or third-party sign-in). If you create an account, you are responsible for safeguarding your login credentials and all activity associated with your account.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">4. Fair Play &amp; User Conduct</h3>
      <p>To maintain competitive integrity, you agree not to:</p>
      <ul className="list-disc list-inside space-y-1 pl-2 text-white/60">
        <li>Use offensive, misleading, or inappropriate display names</li>
        <li>Artificially manipulate scores or gameplay results</li>
        <li>Exploit bugs, timing glitches, or tracking edge cases</li>
        <li>Use bots, scripts, automation, or modified clients</li>
        <li>Interfere with servers, APIs, databases, or security mechanisms</li>
        <li>Attempt to submit fraudulent or replayed score data</li>
      </ul>
      <p>We reserve the right to remove scores, invalidate leaderboard entries, or suspend accounts at our sole discretion.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">5. Scores, Rankings &amp; Leaderboards</h3>
      <p>Scores submitted to 67Ranked may appear on public leaderboards. Leaderboards may reset, archive, or change formats over time. Anti-cheat systems may automatically flag or reject suspicious scores. Manual moderation may be applied where necessary. Leaderboard placement is not guaranteed, and we may remove scores that violate these Terms or compromise fairness.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">6. Camera Usage &amp; Motion Detection</h3>
      <p>67Ranked requires access to your device&apos;s camera to function.</p>
      <ul className="list-disc list-inside space-y-1 pl-2 text-white/60">
        <li>All video processing occurs locally on your device</li>
        <li>We do not record, store, transmit, or view your camera feed</li>
        <li>No video data is sent to our servers</li>
      </ul>
      <p>If camera access is denied or unavailable, gameplay may be limited or disabled.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">7. Intellectual Property</h3>
      <p>All code, game logic, visual design, branding, UI/UX, and related assets of 67Ranked are owned by us or licensed for use. You may not copy, modify, distribute, reverse engineer, or exploit any part of the Service without prior written permission.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">8. Disclaimer</h3>
      <p>67Ranked is provided &quot;as is&quot; and &quot;as available.&quot; We make no guarantees regarding accuracy of motion detection, score consistency across devices, uptime or uninterrupted access, or fitness/performance metrics. The Service is not intended for medical, fitness, or diagnostic purposes.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">9. Limitation of Liability</h3>
      <p>To the maximum extent permitted by law, 67Ranked and its operators shall not be liable for any indirect, incidental, consequential, or special damages arising from your use of the Service.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">10. Changes to Terms</h3>
      <p>We may update these Terms at any time. Continued use of 67Ranked after updates constitutes acceptance of the revised Terms.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">11. Contact</h3>
      <p>For questions or concerns regarding these Terms, please use the contact or support links available on the 67Ranked website.</p>
    </section>
  </div>
);

const PrivacyContent = () => (
  <div className="text-white/70 text-sm leading-relaxed space-y-6">
    <p className="text-white/40 text-xs">Last updated: January 2026</p>
    
    <section className="space-y-2">
      <h3 className="text-white font-semibold">1. Information We Collect</h3>
      <p>Depending on how you use 67Ranked, we may collect:</p>
      <ul className="list-disc list-inside space-y-1 pl-2 text-white/60">
        <li>Gameplay Data: Scores, timestamps, modes played, and leaderboard rankings</li>
        <li>Anonymous Play Data: Display name and score only (no account required)</li>
      </ul>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">2. Camera &amp; Video Data</h3>
      <p>We do not collect, store, or transmit camera data. Motion detection is processed locally using client-side computer vision. No video frames or images leave your device, and we have no access to your camera feed.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">3. How We Use Your Data</h3>
      <p>We use collected data to display public leaderboards and rankings, authenticate users and manage sessions, prevent abuse/cheating/fraudulent submissions, and maintain game performance and reliability.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">4. Publicly Visible Information</h3>
      <p>The following may be visible to other users: display name, scores and rankings, and verification/trust indicators (if enabled). Email addresses, internal IDs, and authentication data are never public.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">5. Data Storage &amp; Security</h3>
      <p>User data is stored using secure, modern infrastructure with protections such as encryption in transit and at rest, secure authentication (including token-based sessions), and access controls/row-level security.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">6. Third-Party Services</h3>
      <p>67Ranked may use third-party services to operate, including database/auth providers (e.g., Supabase), client-side computer vision libraries, and optional OAuth providers for login/verification. Each third party operates under its own privacy policies.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">7. Advertising &amp; Analytics</h3>
      <p>67Ranked may display ads or use analytics tools in the future. Third parties may collect limited non-personal data (e.g., IP, device type). We do not receive personal data from advertisers. Consent tools may be provided where legally required.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">8. Data Retention</h3>
      <p>Account data is retained while your account remains active. Historical scores may be retained for leaderboard integrity and auditing. You may request account deletion using the support options on the site.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">9. Children&apos;s Privacy</h3>
      <p>67Ranked is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information, please contact us and we will take steps to delete such information.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">10. Your Rights</h3>
      <p>Depending on your jurisdiction, you may have the right to access your personal data, request correction or deletion, and withdraw consent where applicable.</p>
    </section>

    <section className="space-y-2">
      <h3 className="text-white font-semibold">11. Changes to This Policy</h3>
      <p>We may update this Privacy Policy periodically. Material changes will be communicated through the Service.</p>
    </section>
  </div>
);

export function LegalFooter() {
  const [openDoc, setOpenDoc] = useState<LegalDoc>(null);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-40 px-3 py-2 sm:px-4 sm:py-2.5 bg-black/30 backdrop-blur-md border-t border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-white/30">
            © 2026 67Ranked
          </span>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setOpenDoc('terms')}
              className="text-[10px] sm:text-xs text-white/30 hover:text-white/60 hover:underline transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setOpenDoc('privacy')}
              className="text-[10px] sm:text-xs text-white/30 hover:text-white/60 hover:underline transition-colors"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>

      <LegalModal
        open={openDoc !== null}
        activeDoc={openDoc || 'terms'}
        onDocChange={setOpenDoc}
        onClose={() => setOpenDoc(null)}
      >
        {openDoc === 'terms' ? <TermsContent /> : <PrivacyContent />}
      </LegalModal>
    </>
  );
}
