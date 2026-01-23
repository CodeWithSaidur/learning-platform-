import CtaSec from '@/components/landing/cta-sec'
import FeaturesSec from '@/components/landing/features-sec'
import HeroSec from '@/components/landing/hero-sec'
import HowItsWorkSec from '@/components/landing/how-its-work-sec'
import PricingSec from '@/components/landing/pricing-sec'
import { MotionWrapper } from '@/components/ui/motion'

const baseTransition = {
  duration: 0.6,
  ease: [0.22, 1, 0.36, 1] // smooth, premium easing
}

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <MotionWrapper
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}>
        <HeroSec />
      </MotionWrapper>

      <MotionWrapper
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}>
        <FeaturesSec />
      </MotionWrapper>

      <MotionWrapper
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}>
        <HowItsWorkSec />
      </MotionWrapper>

      <MotionWrapper
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}>
        <PricingSec />
      </MotionWrapper>

      <MotionWrapper
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}>
        <CtaSec />
      </MotionWrapper>
    </div>
  )
}
