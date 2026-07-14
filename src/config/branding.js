import { icpcLogoDataUri } from '../assets/icpcLogo'

export const branding = {
  appName: 'ICPC Professional Accreditation CMS',
  shortName: 'ICPC',
  organizationName: 'اللجنة الدولية لحماية المدنيين',
  organizationNameEnglish: 'International Commission for the Protection of Civilians',
  organizationNameDutch: 'Internationale Commissie voor de Bescherming van Burgers',
  productName: 'منصة الاعتماد المهني',
  productNameEnglish: 'Professional Accreditation Platform',
  productNameDutch: 'Platform voor professionele accreditatie',
  logo: {
    src: icpcLogoDataUri,
    fullText: 'ICPC',
    subText: 'اللجنة الدولية لحماية المدنيين',
  },
  accreditationLevels: ['أساسي', 'متقدم', 'خبير'],
  accreditationLevelsEnglish: ['Foundation', 'Advanced', 'Expert'],
  accreditationLevelsDutch: ['Basis', 'Gevorderd', 'Expert'],
  locales: ['ar', 'en', 'nl'],
}

export function getBrandText(language = 'ar') {
  if (language === 'nl') {
    return {
      organizationName: branding.organizationNameDutch,
      productName: branding.productNameDutch,
      accreditationLevels: branding.accreditationLevelsDutch,
    }
  }

  if (language === 'en') {
    return {
      organizationName: branding.organizationNameEnglish,
      productName: branding.productNameEnglish,
      accreditationLevels: branding.accreditationLevelsEnglish,
    }
  }

  return {
    organizationName: branding.organizationName,
    productName: branding.productName,
    accreditationLevels: branding.accreditationLevels,
  }
}
