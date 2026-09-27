"use client";
import React, { useEffect, useState } from "react";
import { Phone, Mail, Building2, CalendarDays, Target } from "lucide-react";

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
}

const DEFAULT: AboutContent = {
  headline: "About Vinks Crackers",
  tagline: "Quality, Trust, and Joy in every spark.",
  story: ``,
  ceoName: "Vigneshwaran Ramachandran",
  ceoTitle: "CEO & Founder",
  ceoPhone: "7373872638",
  email: "vignesh.crackersfireworks@gmail.com",
  mission: "Our mission is to make shopping, finance, and market insights simple and accessible for everyone — from festive crackers to wedding invitations, curated gifts to expert financial tools.",
  founded: "2024",
};

export default function AboutPage() {
  const [content, setContent] = useState<AboutContent>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);

  const carouselImages = [
    "/images/ceo-office.jpg",
    "/images/ceo-walking.jpg",
    "/images/ashok-chairman.png",
    "/images/vicky-MD.png",
  ];

  useEffect(() => {
    fetch("/api/about")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setContent(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % carouselImages.length);
    }, 4000);
    return () => clearInterval(timer);
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { icon: <CalendarDays size={20} />, label: "Founded", value: content.founded || "2024" },
          { icon: <Building2 size={20} />, label: "Model", value: "Multi-Business" },
          { icon: <Target size={20} />, label: "Mission", value: "One Platform" },
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

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-50">
          <h2 className="font-heading font-bold text-brand-dark text-xl">Meet the Founder</h2>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="relative w-full">
              <img
                src="/images/ceo.png"
                alt="Vigneshwaran Ramachandran"
                className="rounded-2xl shadow-lg w-full h-auto block"
              />
              <div
                className="absolute -bottom-2 -left-2 w-8 h-8 rounded-xl"
                style={{ background: "linear-gradient(135deg,#FFC43F,#f7a422)" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading font-bold text-2xl sm:text-3xl text-brand-dark leading-tight">
                {content.ceoName}
              </div>
              <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start mt-4 mb-6">
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "#FFF8E7", color: "#f7a422" }}
                >
                  {content.ceoTitle || "CEO & Founder"}
                </div>
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
              <p className="text-gray-600 text-sm leading-relaxed mb-5 whitespace-pre-line">
                {content.story}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="text-center">
          <h2 className="font-heading font-bold text-brand-dark text-2xl">Our Team</h2>
          <div className="w-12 h-1 bg-brand-gold mx-auto mt-2 rounded-full" style={{ background: "#FFC43F" }} />
        </div>
        <div className="relative w-full overflow-hidden rounded-3xl shadow-lg h-64 sm:h-96">
          {carouselImages.map((img, index) => (
            <div
              key={img}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentImage ? "opacity-100" : "opacity-0"
              }`}
            >
              <img src={img} alt={`Team ${index + 1}`} className="w-full h-full object-contain" />
            </div>
          ))}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {carouselImages.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentImage ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

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

      <div className="rounded-2xl p-6 sm:p-8 text-center" style={{ background: "#1a1a2e" }}>
        <h2 className="font-heading font-bold text-white text-xl mb-2" style={{ color: "white" }}>Get in Touch</h2>
        <p className="text-white text-sm mb-5">Have questions? We'd love to hear from you.</p>
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
