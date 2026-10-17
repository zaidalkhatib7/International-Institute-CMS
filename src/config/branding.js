import { icpcLogoDataUri } from '../assets/icpcLogo'

export const branding = {
  appName: 'ICPC Professional Accreditation Platform',
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
  // The three levels of the professional RPL pathway, named as the pathway names them (platform walk, 17 Oct 2026, UI-11).
  accreditationLevels: ['ممارس مهني', 'ممارس مهني متقدم', 'خبير مهني'],
  accreditationLevelsEnglish: ['Professional Practitioner', 'Advanced Professional Practitioner', 'Professional Expert'],
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
