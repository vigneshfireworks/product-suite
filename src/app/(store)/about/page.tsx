"use client";
import React, { useEffect, useState } from "react";
import { Phone, Mail, Building2, CalendarDays, Target, BookOpen, ShoppingCart } from "lucide-react";

interface AboutContent {
  headline: string;
  tagline: string;
  story: string;
  ceoName: string;
  ceoTitle: string;
  ceoPhone: string;
  email: string;
  mission: string;
  founded: string;
  ceoPhoto1?: string;
  ceoPhoto2?: string;
}

export default function AboutPage() {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/about")
      .then(r => r.json())
      .then(d => { setContent(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!content) return null;

  const hasPhotos = content.ceoPhoto1 || content.ceoPhoto2;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">

      {/* Hero banner */}
      <div
        className="rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%)" }}
      >
        <div
          className="absolute -top-10 -right-10 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#FFC43F,transparent)" }}
        />
        <div className="relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
          >
            <ShoppingCart size={26} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-3 text-white">
            {content.headline}
          </h1>
          <p className="text-[#FFC43F] text-base sm:text-lg font-semibold leading-snug max-w-xl">
            {content.tagline}
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { icon: <CalendarDays size={20} />, label: "Founded", value: content.founded || "2024" },
          { icon: <Building2 size={20} />,   label: "Model",   value: "Multi-Business" },
          { icon: <Target size={20} />,      label: "Mission", value: "One Platform" },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFF8E7" }}>
              <span style={{ color: "#FFC43F" }}>{icon}</span>
            </div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
            <div className="font-bold text-brand-dark text-base">{value}</div>
          </div>
        ))}
      </div>

      {/* CEO section — photos + info side by side */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Section title */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-50">
          <h2 className="font-heading font-bold text-brand-dark text-xl">Meet the Founder</h2>
        </div>

        <div className="p-6 sm:p-8">
          {/* Photo gallery + info layout */}
          <div className="flex flex-col sm:flex-row gap-8 items-start">

            {/* Photos */}
            {hasPhotos && (
              <div className="flex gap-3 flex-shrink-0">
                {content.ceoPhoto1 && (
                  <div className="relative">
                    <img
                      src={content.ceoPhoto1}
                      alt={`${content.ceoName} - at work`}
                      className="w-36 sm:w-44 rounded-2xl object-cover shadow-md"
                      style={{ height: "200px", objectPosition: "top" }}
                    />
                    {/* decorative corner */}
                    <div
                      className="absolute -bottom-2 -left-2 w-8 h-8 rounded-xl"
                      style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)", zIndex: -1 }}
                    />
                  </div>
                )}
                {content.ceoPhoto2 && (
                  <div className="relative self-end">
                    <img
                      src={content.ceoPhoto2}
                      alt={`${content.ceoName} - lifestyle`}
                      className="w-28 sm:w-36 rounded-2xl object-cover shadow-md"
                      style={{ height: "170px", objectPosition: "top" }}
                    />
                    <div
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-lg"
                      style={{ background: "#1a1a2e", zIndex: -1 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Avatar fallback when no photos */}
              {!hasPhotos && (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mb-4"
                  style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
                >
                  {content.ceoName?.[0] ?? "V"}
                </div>
              )}

              <div className="font-heading font-bold text-2xl text-brand-dark leading-tight">
                {content.ceoName}
              </div>
              <div
                className="inline-block mt-1 mb-4 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: "#FFF8E7", color: "#f7a422" }}
              >
                {content.ceoTitle || "CEO & Founder"}
              </div>

              <p className="text-gray-500 text-sm leading-relaxed mb-5">
                Visionary entrepreneur who founded Product Suite in {content.founded || "2024"} with
                a single small business and a bold vision. Through dedication and strategic growth,
                that one venture has transformed into a thriving multi-business platform serving
                customers across retail, finance, gifts, invitations, and market analytics.
              </p>

              <div className="flex flex-wrap gap-3">
                {content.ceoPhone && (
                  <a
                    href={`tel:${content.ceoPhone}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: "#FFF8E7", color: "#f7a422" }}
                  >
                    <Phone size={14} />
                    {content.ceoPhone}
                  </a>
                )}
                {content.email && (
                  <a
                    href={`mailto:${content.email}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-600 transition-colors"
                    style={{ background: "#EFF6FF" }}
                  >
                    <Mail size={14} />
                    {content.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Our Story */}
      {content.story && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#FFF8E7" }}>
              <BookOpen size={16} style={{ color: "#FFC43F" }} />
            </div>
            <h2 className="font-heading font-bold text-brand-dark text-lg">Our Story</h2>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{content.story}</p>
        </div>
      )}

      {/* Mission */}
      {content.mission && (
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: "linear-gradient(135deg,#FFF8E7 0%,#fff3d0 100%)", border: "1px solid #FFE082" }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#FFC43F" }}>
              <Target size={16} className="text-white" />
            </div>
            <h2 className="font-heading font-bold text-brand-dark text-lg">Our Mission</h2>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{content.mission}</p>
        </div>
      )}

      {/* Contact CTA */}
      <div className="rounded-2xl p-6 sm:p-8 text-center" style={{ background: "#1a1a2e" }}>
        <h2 className="font-heading font-bold text-white text-xl mb-2">Get in Touch</h2>
        <p className="text-gray-400 text-sm mb-5">Have questions? We'd love to hear from you.</p>
        <a
          href={`mailto:${content.email}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg,#FFC43F 0%,#f7a422 100%)" }}
        >
          <Mail size={16} />
          {content.email}
        </a>
      </div>
    </div>
  );
}
