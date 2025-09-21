"use client";
import Image from 'next/image';
import React from "react";
import { FileText, Lock, Lightbulb, Cpu } from "lucide-react";
import Navbar from "@/components/navbar";

const features = [
  {
    id: 1,
    title: "AI-Powered Document Parsing",
    description:
      "Instantly convert complex legal language into easy-to-understand summaries.",
    icon: <Cpu className="w-8 h-8 text-[#1EA7FF]" />,
  },
  {
    id: 2,
    title: "Clause & Deadline Detection",
    description:
      "Automatically highlight important clauses, obligations, and deadlines to keep you informed.",
    icon: <FileText className="w-8 h-8 text-[#1EA7FF]" />,
  },
  {
    id: 3,
    title: "Secure & Private",
    description:
      "Your documents stay safe – fully encrypted and never shared without permission.",
    icon: <Lock className="w-8 h-8 text-[#1EA7FF]" />,
  },
  {
    id: 4,
    title: "Learning Hub & Tips",
    description:
      "Learn key legal concepts, get examples, and make smarter decisions with minimal effort.",
    icon: <Lightbulb className="w-8 h-8 text-[#1EA7FF]" />,
  },
];

export default function LearnMorePage() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Navbar />

      {/* Top Section */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center lg:items-start gap-12 px-6 py-16">
        {/* Left: Illustration */}
        <div className="flex-1 flex justify-center lg:justify-start">
          <Image
            src="/icons/learn-more-pic.jpg"
            alt="Illustration"
            className="w-full max-w-lg"
          />
        </div>

        {/* Right: Heading + Tagline */}
        <div className="flex-1 flex flex-col pt-20 space-y-6 text-center lg:text-left">
          <h1 className="text-5xl font-bold font-sans text-[#1EA7FF]">
            Learn More About Our Solution
          </h1>
          <p className="text-gray-700 dark:text-gray-300 text-lg max-w-lg font-sans">
            Our platform simplifies legal documents, highlights important clauses,
            and provides actionable insights — all powered by AI and designed to
            save you time and reduce mistakes.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-start space-x-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>{feature.icon}</div>
              <div>
                <h2 className="font-bold text-lg font-sans text-gray-900 dark:text-white">
                  {feature.title}
                </h2>
                <p className="text-gray-600 font-sans dark:text-gray-300 text-sm mt-1">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
