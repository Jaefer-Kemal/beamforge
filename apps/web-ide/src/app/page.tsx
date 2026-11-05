import React from 'react';
import { LandingNavbar } from '../components/landing/LandingNavbar';
import { LandingHero } from '../components/landing/LandingHero';
import { LandingMetricsStrip } from '../components/landing/LandingMetricsStrip';
import { LandingBentoFeatures } from '../components/landing/LandingBentoFeatures';
import { LandingWorldsSection } from '../components/landing/LandingWorldsSection';
import { LandingArchitectureComparison } from '../components/landing/LandingArchitectureComparison';
import { LandingFooterCTA } from '../components/landing/LandingFooterCTA';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#E8ECF2] dark:bg-[#060810] text-[#0A0F1E] dark:text-[#F0F4FC] overflow-x-hidden transition-colors duration-300">
      {/* Dynamic Ambient Mesh Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-sky-400/20 dark:bg-sky-500/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-violet-400/20 dark:bg-violet-600/15 blur-[140px]" />
        <div className="absolute bottom-10 left-1/4 w-96 sm:w-[600px] h-96 sm:h-[600px] rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-[130px]" />
      </div>

      {/* Floating Glass Navigation */}
      <LandingNavbar />

      {/* Main Content Sections */}
      <main className="relative z-10">
        <LandingHero />
        <LandingMetricsStrip />
        <LandingBentoFeatures />
        <LandingWorldsSection />
        <LandingArchitectureComparison />
        <LandingFooterCTA />
      </main>
    </div>
  );
}
