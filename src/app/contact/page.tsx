import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact"
};

export default function ContactPage() {
  const email = process.env.CONTACT_EMAIL ?? "hello@example.com";

  return (
    <section className="content-page">
      <h1>Contact</h1>
      <p>
        For station metadata corrections, source questions, or removal requests, contact{" "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </section>
  );
}
