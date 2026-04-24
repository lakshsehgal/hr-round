"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const EXPERIENCE_OPTIONS = [
  "0-1 years",
  "1-2 years",
  "2-3 years",
  "3-5 years",
  "5+ years",
];

const TOOL_OPTIONS = [
  "Adobe Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "CapCut",
  "Figma",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Canva",
];

const NOTICE_OPTIONS = ["Immediate", "15 days", "30 days", "60 days", "90 days"];
const ROLE_OPTIONS = [
  "Video Editor",
  "Graphic Designer",
  "Both - Video Editor & Graphic Designer",
];
const WFO_OPTIONS = ["Yes", "No", "Hybrid preferred"];

export function VideoEditorDesignerForm({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [roleType, setRoleType] = useState<string>("");
  const [wfoDelhi, setWfoDelhi] = useState<string>("");

  function toggleTool(tool: string) {
    setTools((current) =>
      current.includes(tool) ? current.filter((t) => t !== tool) : [...current, tool],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!roleType) {
      setErrorMessage("Please select a role type");
      return;
    }
    if (tools.length === 0) {
      setErrorMessage("Please select at least one tool");
      return;
    }
    if (!wfoDelhi) {
      setErrorMessage("Please choose a WFO preference");
      return;
    }

    setStatus("submitting");

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("jobId", jobId);
    formData.append("roleType", roleType);
    formData.append("wfoDelhi", wfoDelhi);
    formData.append("tools", JSON.stringify(tools));

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Submission failed");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-accent bg-accent-dim p-12 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-accent-dim text-3xl text-accent">
          ✓
        </div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          Application submitted!
        </h2>
        <p className="mt-2 text-sm text-secondary">
          Thanks for applying. We&apos;ll review and get back within 5 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" encType="multipart/form-data">
      {/* Section 1 — Personal Information */}
      <FormSection number="01" title="Personal Information">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input name="fullName" label="Full Name" required placeholder="Your full name" />
          <Input
            name="email"
            type="email"
            label="Email Address"
            required
            placeholder="you@email.com"
          />
          <Input
            name="phone"
            type="tel"
            label="Phone Number"
            required
            placeholder="+91 98765 43210"
          />
          <Input name="city" label="City" required placeholder="Current city" />
        </div>
        <Input
          name="linkedinUrl"
          type="url"
          label="LinkedIn Profile"
          placeholder="https://linkedin.com/in/yourprofile"
        />
      </FormSection>

      {/* Section 2 — Role & Skills */}
      <FormSection number="02" title="Role & Skills">
        <Field label="Which role are you applying for?" required>
          <div className="grid gap-2.5">
            {ROLE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt}
                type="radio"
                name="roleType"
                value={opt}
                checked={roleType === opt}
                onChange={() => setRoleType(opt)}
              />
            ))}
          </div>
        </Field>

        <Field label="Years of Experience" required>
          <Select name="experience" required>
            <option value="" disabled>
              Select experience level
            </option>
            {EXPERIENCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace("-", "–")}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tools you use" required hint="Select all that apply">
          <div className="grid gap-2.5">
            {TOOL_OPTIONS.map((tool) => (
              <OptionPill
                key={tool}
                type="checkbox"
                name="tools-ui"
                value={tool}
                checked={tools.includes(tool)}
                onChange={() => toggleTool(tool)}
              />
            ))}
          </div>
        </Field>
      </FormSection>

      {/* Section 3 — Portfolio & Work */}
      <FormSection number="03" title="Portfolio & Work Samples">
        <Field
          label="Portfolio / Reel Link"
          required
          hint="Share your best work — Google Drive, Behance, Dribbble, YouTube, Instagram, etc."
        >
          <InputRaw
            name="portfolio"
            type="url"
            required
            placeholder="https://drive.google.com/... or https://behance.net/..."
          />
        </Field>

        <Field
          label="Have you worked on D2C brand creatives before?"
          required
          hint="Tell us about your experience with D2C content — ad creatives, UGC edits, social media, etc."
        >
          <Textarea
            name="d2cExperience"
            required
            placeholder="E.g. Edited 50+ UGC-style video ads for fashion & beauty D2C brands, achieving 2x improvement in hook rates..."
          />
        </Field>

        <Field label="What makes your edits/designs stand out?" required>
          <Textarea
            name="standout"
            required
            placeholder="What's your creative superpower? Fast turnarounds, scroll-stopping hooks, clean typography, motion graphics..."
          />
        </Field>
      </FormSection>

      {/* Section 4 — Availability & Compensation */}
      <FormSection number="04" title="Availability & Compensation">
        <Field label="Are you okay with WFO in Delhi?" required>
          <div className="grid gap-2.5">
            {WFO_OPTIONS.map((opt) => (
              <OptionPill
                key={opt}
                type="radio"
                name="wfoDelhi"
                value={opt}
                checked={wfoDelhi === opt}
                onChange={() => setWfoDelhi(opt)}
              />
            ))}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            name="currentCtc"
            label="Current CTC (per annum)"
            required
            placeholder="e.g. ₹4,00,000"
          />
          <Input
            name="expectedCtc"
            label="Expected CTC (per annum)"
            required
            placeholder="e.g. ₹6,00,000"
          />
        </div>

        <Field label="Notice Period" required>
          <Select name="noticePeriod" required>
            <option value="" disabled>
              Select notice period
            </option>
            {NOTICE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Anything else you&apos;d like us to know?">
          <Textarea
            name="additionalInfo"
            placeholder="Awards, certifications, passion projects, or anything that makes you unique..."
          />
        </Field>

        <Field
          label="Resume / CV (optional)"
          hint="Optional — your portfolio link is the primary artifact. PDF only, max 5 MB."
        >
          <input
            type="file"
            name="resume"
            accept="application/pdf"
            className="block w-full text-sm text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-accent-dim file:px-4 file:py-2 file:text-sm file:font-semibold file:text-accent file:transition-colors hover:file:bg-[rgba(232,255,71,0.2)]"
          />
        </Field>
      </FormSection>

      {errorMessage && (
        <div className="rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm text-danger">
          {errorMessage}
        </div>
      )}

      <div className="pt-2 text-center">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center rounded-2xl bg-accent px-16 py-4 font-display text-base font-bold tracking-tight text-bg shadow-[0_0_0_0_rgba(232,255,71,0)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(232,255,71,0.25)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {status === "submitting" ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-bg border-t-transparent" />
          ) : (
            "Submit Application"
          )}
        </button>
        <p className="mt-3.5 text-xs text-muted">
          Your information is safe with us. We&apos;ll review and get back within 5 business
          days.
        </p>
      </div>
    </form>
  );
}

function FormSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-9">
      <header className="mb-7 flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent font-display text-[13px] font-extrabold text-bg">
          {number}
        </div>
        <div className="font-display text-lg font-bold tracking-tight">{title}</div>
      </header>
      <div className="grid gap-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-fg">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </span>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Input({
  label,
  required,
  hint,
  ...props
}: {
  label: string;
  required?: boolean;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} required={required} hint={hint}>
      <InputRaw required={required} {...props} />
    </Field>
  );
}

function InputRaw(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3.5 font-sans text-sm text-fg placeholder:text-muted focus:border-accent focus:shadow-focus focus:outline-none"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      defaultValue=""
      className="w-full cursor-pointer appearance-none rounded-xl border border-border bg-surface-2 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1%201.5L6%206.5L11%201.5%22%20stroke%3D%22%23888%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[position:right_1rem_center] bg-no-repeat px-4 py-3.5 pr-10 font-sans text-sm text-fg focus:border-accent focus:shadow-focus focus:outline-none"
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={4}
      {...props}
      className="block w-full resize-y rounded-xl border border-border bg-surface-2 px-4 py-3.5 font-sans text-sm leading-relaxed text-fg placeholder:text-muted focus:border-accent focus:shadow-focus focus:outline-none"
    />
  );
}

function OptionPill({
  type,
  name,
  value,
  checked,
  onChange,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
        checked
          ? "border-accent bg-accent-dim"
          : "border-border bg-surface-2 hover:border-muted"
      }`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 cursor-pointer accent-accent"
      />
      <span className="text-sm">{value}</span>
    </label>
  );
}
