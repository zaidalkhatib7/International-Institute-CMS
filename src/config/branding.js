import { icpcLogoDataUri } from '../assets/icpcLogo'

export const branding = {
  appName: 'ICPC Professional Accreditation CMS',
  shortName: 'ICPC',
  organizationName: 'اللجنة الدولية لحماية المدنيين',
  organizationNameEnglish: 'International Commission for the Protection of Civilians',
  productName: 'منصة الاعتماد المهني',
  productNameEnglish: 'Professional Accreditation Platform',
  logo: {
    src: icpcLogoDataUri,
    fullText: 'ICPC',
    subText: 'اللجنة الدولية لحماية المدنيين',
  },
  accreditationLevels: ['أساسي', 'متقدم', 'خبير'],
  accreditationLevelsEnglish: ['Foundation', 'Advanced', 'Expert'],
  locales: ['ar', 'en'],
}

export function getBrandText(language = 'ar') {
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
