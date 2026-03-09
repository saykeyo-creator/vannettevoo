export interface SiteInfo {
  name: string;
  tagline: string;
  location: string;
  email: string;
  phone: string;
  clinicHours: {
    mondayToFriday: string;
    saturdaySunday: string;
  };
  copyright: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface HeroButton {
  label: string;
  href: string;
}

export interface ConditionPreview {
  title: string;
  description: string;
}

export interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

export interface ConditionDetail {
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  symptoms: string[];
  howWeHelp: string;
}

export interface Therapy {
  title: string;
  description: string;
}

export interface GuidingPrinciple {
  title: string;
  description: string;
}

export interface FormField {
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  conditionalFollowUp?: string;
  allowOther?: boolean;
  note?: string;
  hint?: string;
  min?: number;
  max?: number;
  labels?: string[];
}

export interface SurveyStep {
  stepNumber: number;
  title: string;
  description: string;
  fields?: FormField[];
  questions?: (FormField & { number?: number; question: string })[];
  nextOfKin?: {
    heading: string;
    fields: FormField[];
  };
  note?: string;
}

export interface SiteContent {
  site: SiteInfo;
  navigation: NavItem[];
  pages: {
    home: {
      hero: {
        heading: string;
        subtext: string;
        buttons: HeroButton[];
        trustSignals: string[];
      };
      conditionsPreview: {
        heading: string;
        subtext: string;
        conditions: ConditionPreview[];
        buttonLabel: string;
        buttonHref: string;
      };
      howItWorks: {
        heading: string;
        steps: HowItWorksStep[];
      };
      cta: {
        heading: string;
        body: string;
        buttonLabel: string;
        buttonHref: string;
      };
    };
    about: {
      heading: string;
      bio: string[];
      guidingPrinciples: GuidingPrinciple[];
      qualifications: string[];
    };
    conditions: {
      heading: string;
      subtext: string;
      conditionsList: ConditionDetail[];
    };
    services: {
      heading: string;
      introText: string;
      therapies: Therapy[];
      firstVisit: {
        heading: string;
        paragraphs: string[];
      };
      pricing: {
        heading: string;
        introText: string;
        items: {
          name: string;
          duration: string;
          price: string;
          description: string;
        }[];
        note: string;
      };
    };
    newPatient: {
      heading: string;
      subtext: string;
      buttonLabel: string;
      trustSignals: string[];
      steps: (HowItWorksStep & {
        time: string;
        buttonLabel?: string;
        buttonHref?: string;
      })[];
      returningPatients: {
        heading: string;
        text: string;
        buttonLabel: string;
        buttonHref: string;
      };
    };
    book: {
      heading: string;
      subtext: string;
      steps: string[];
      availability: {
        days: string;
        hours: string;
        slotDuration: string;
        timezone: string;
      };
      formFields: FormField[];
      confirmationMessage: { heading: string; text: string };
    };
    contact: {
      heading: string;
      subtext: string;
      contactInfo: {
        location: string;
        phone: string;
        email: string;
        hours: { mondayToFriday: string; saturdaySunday: string };
      };
      formFields: FormField[];
      confirmationMessage: { heading: string; text: string };
    };
    surveyIntake: {
      heading: string;
      subtext: string;
      confirmationMessage: {
        heading: string;
        text: string;
        emailNote: string;
        nextAction: { label: string; href: string; subtext: string };
      };
      steps: SurveyStep[];
    };
    surveyProgress: {
      heading: string;
      subtext: string;
      identityFields: FormField[];
      symptomRating: {
        heading: string;
        instructions: string;
        areas: string[];
        scale: { min: number; max: number; naOption: boolean };
      };
      additionalFeedback: {
        heading: string;
        questions: (FormField & { question: string })[];
      };
      confirmationMessage: { heading: string; text: string };
    };
  };
}
