import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy"
};

export default function PrivacyPage() {
  return (
    <section className="content-page">
      <h1>Privacy</h1>
      <p>
        Radio Tracker stores station-provided song metadata, timestamps, and operational logs needed to keep the
        archive current. It does not require listener accounts.
      </p>
      <p>
        Public pages may use privacy-friendly analytics to understand aggregate traffic. Server logs may include
        standard request metadata for reliability and abuse prevention.
      </p>
    </section>
  );
}
