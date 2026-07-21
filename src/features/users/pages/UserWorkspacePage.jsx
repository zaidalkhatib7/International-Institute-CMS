import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  FolderOpen,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Select,
} from "../../../components/ui";
import {
  unwrapApiData,
  unwrapCollection,
  readApiError,
} from "../../../services/apiResponse";
import {
  createUserQualification,
  deleteUserQualification,
  enrollUserByStaff,
  fetchUser,
  fetchUserProfessionalEligibility,
  updateUser,
  updateUserQualification,
} from "../services/usersService";
import {
  createRplApplication,
  fetchRplReferenceData,
} from "../../rpl/services/rplService";
import { fetchAdminPrograms } from "../../programs/services/programsService";
import { localize } from "../../rpl/domain/rpl";
import { getAdminLanguage } from "../../../services/languageStorage";
import { useAuthorization } from "../../auth/context/useAuthorization";
import RplStatusBadge from "../../rpl/components/RplStatusBadge";
import {
  formatLocalizedDate,
  formatLocalizedNumber,
} from "../../../utils/localization";

const copyByLanguage = {
  en: {
    workspace: "Client workspace",
    description:
      "Manage this client without impersonating their account. Every staff action is auditable.",
    back: "Back to users",
    account: "Account information",
    edit: "Edit information",
    save: "Save changes",
    cancel: "Cancel",
    name: "Full name",
    email: "Email address",
    username: "Username",
    phone: "Phone number",
    locale: "Preferred language",
    timezone: "Time zone",
    channel: "Registration channel",
    onsite: "On-site assisted",
    online: "Online self-service",
    identifiers: "Sign-in identifiers",
    none: "No identifier configured",
    registrationId: "Registration ID",
    created: "Account created",
    academicEvidence: "Academic-entry evidence",
    academicEvidenceHint:
      "Record and verify qualifications before routing. A declared bachelor degree or equivalent excludes RPL.",
    addQualification: "Add qualification",
    updateQualification: "Update qualification",
    type: "Qualification type",
    title: "Qualification title",
    institution: "Institution",
    field: "Field / specialty",
    startDate: "Start date",
    completionDate: "Completion date",
    verified: "Verified by staff",
    unverified: "Pending verification",
    editQualification: "Edit",
    deleteQualification: "Delete",
    qualificationSaved: "Qualification saved and route recalculated.",
    qualificationDeleted: "Qualification deleted and route recalculated.",
    qualificationFailed: "Unable to save the qualification.",
    confirmDelete: "Delete this qualification?",
    routing: "Service routing decision",
    rplWith: "RPL — with secondary certificate",
    rplWithout: "RPL — without secondary certificate",
    rplWithHint:
      "Experience and evidence are assessed. Competency-gap programmes may be required before professional accreditation.",
    rplWithoutHint:
      "Experience and evidence are assessed. Foundation and competency-gap programmes may be required before professional accreditation.",
    noRplDegree: "RPL is not available for this client",
    noRplDegreeHint:
      "A bachelor degree or equivalent has been declared. Use Professional Qualifications only.",
    pendingAcademic: "Academic degree evidence is awaiting verification",
    pendingAcademicHint:
      "RPL stays unavailable. Verify the degree, then choose an eligible professional qualification.",
    pendingSecondary: "Secondary certificate is awaiting verification",
    pendingSecondaryHint:
      "Do not select the no-secondary route while this evidence is under review.",
    startRpl: "Create the correct RPL case",
    noPathway: "The required RPL pathway is not configured yet.",
    targetLevel: "Desired professional accreditation target",
    targetLevelHint:
      "Confirm what the applicant wants to pursue. Gemini will assess evidence and learning gaps against this target.",
    selectTargetLevel: "Select Practitioner, Advanced Practitioner, or Expert",
    professional: "Professional Qualifications",
    professionalHint:
      "This is a separate service from RPL and uses verified academic-entry requirements.",
    selectProgram: "Select an eligible programme",
    enroll: "Enroll and charge wallet",
    noPrograms:
      "No professional qualification programme is currently eligible. Verify the academic evidence or add the missing requirement.",
    diploma: "Professional diploma",
    master: "Professional master",
    doctorate: "Professional doctorate",
    cases: "Existing RPL cases",
    noCases: "No RPL case exists for this client.",
    points: "points",
    loadFailed: "Unable to load the client workspace.",
    createCaseFailed: "Unable to create the RPL case.",
    enrollFailed: "Unable to enroll this client.",
    updateFailed: "Unable to update user information.",
    updated: "User information updated successfully.",
    saving: "Saving…",
  },
  ar: {
    workspace: "مساحة عمل العميل",
    description:
      "إدارة العميل دون الدخول إلى حسابه، وتبقى جميع إجراءات الموظف مسجلة وقابلة للتدقيق.",
    back: "العودة إلى المستخدمين",
    account: "بيانات الحساب",
    edit: "تعديل البيانات",
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    username: "اسم المستخدم",
    phone: "رقم الهاتف",
    locale: "اللغة المفضلة",
    timezone: "المنطقة الزمنية",
    channel: "قناة التسجيل",
    onsite: "تسجيل بمساعدة داخل المكتب",
    online: "تسجيل ذاتي عبر الموقع",
    identifiers: "معرّفات تسجيل الدخول",
    none: "لا توجد معرّفات دخول مهيأة",
    registrationId: "رقم التسجيل",
    created: "تاريخ إنشاء الحساب",
    academicEvidence: "أدلة المؤهلات ومسار القبول",
    academicEvidenceHint:
      "سجّل المؤهلات وتحقق منها قبل اختيار الخدمة. وجود بكالوريوس أو ما يعادله يمنع مسار RPL.",
    addQualification: "إضافة مؤهل",
    updateQualification: "تحديث المؤهل",
    type: "نوع المؤهل",
    title: "اسم المؤهل",
    institution: "الجهة التعليمية",
    field: "التخصص",
    startDate: "تاريخ البدء",
    completionDate: "تاريخ الإتمام",
    verified: "تم التحقق بواسطة الموظف",
    unverified: "بانتظار التحقق",
    editQualification: "تعديل",
    deleteQualification: "حذف",
    qualificationSaved: "تم حفظ المؤهل وإعادة احتساب المسار.",
    qualificationDeleted: "تم حذف المؤهل وإعادة احتساب المسار.",
    qualificationFailed: "تعذر حفظ المؤهل.",
    confirmDelete: "هل تريد حذف هذا المؤهل؟",
    routing: "قرار توجيه الخدمة",
    rplWith: "RPL — مع شهادة ثانوية عامة",
    rplWithout: "RPL — دون شهادة ثانوية عامة",
    rplWithHint:
      "يُقيّم ملف الخبرة والأدلة، وقد تُطلب برامج لسد فجوات الكفاءة قبل الاعتماد المهني.",
    rplWithoutHint:
      "يُقيّم ملف الخبرة والأدلة، وقد تُطلب برامج تأسيسية وبرامج لسد فجوات الكفاءة قبل الاعتماد المهني.",
    noRplDegree: "مسار RPL غير متاح لهذا العميل",
    noRplDegreeHint:
      "تم تسجيل بكالوريوس أو مؤهل أكاديمي معادل؛ استخدم قسم المؤهلات المهنية فقط.",
    pendingAcademic: "دليل المؤهل الأكاديمي بانتظار التحقق",
    pendingAcademicHint:
      "يبقى RPL غير متاح. تحقق من المؤهل ثم اختر المؤهل المهني المناسب.",
    pendingSecondary: "شهادة الثانوية العامة بانتظار التحقق",
    pendingSecondaryHint:
      "لا تختَر مسار دون الثانوية العامة بينما هذا الدليل قيد المراجعة.",
    startRpl: "إنشاء طلب RPL الصحيح",
    noPathway: "مسار RPL المطلوب غير مهيأ بعد.",
    targetLevel: "هدف الاعتماد المهني المطلوب",
    targetLevelHint:
      "أكّد المستوى الذي يريد المتقدم السعي إليه. سيحلل Gemini الأدلة والفجوات وفق صرامة هذا الهدف.",
    selectTargetLevel:
      "اختر ممارسًا مهنيًا أو ممارسًا مهنيًا متقدمًا أو خبيرًا مهنيًا",
    professional: "المؤهلات المهنية",
    professionalHint:
      "هذه خدمة مستقلة تماماً عن RPL وتعتمد على مؤهلات أكاديمية موثقة.",
    selectProgram: "اختر برنامجاً متاحاً",
    enroll: "تسجيل وخصم من المحفظة",
    noPrograms:
      "لا يوجد برنامج مؤهل حالياً. تحقق من الأدلة الأكاديمية أو أضف المتطلب الناقص.",
    diploma: "دبلوم مهني",
    master: "ماجستير مهني",
    doctorate: "دكتوراه مهنية",
    cases: "طلبات RPL الحالية",
    noCases: "لا يوجد طلب RPL لهذا العميل.",
    points: "نقطة",
    loadFailed: "تعذر تحميل مساحة عمل العميل.",
    createCaseFailed: "تعذر إنشاء طلب RPL.",
    enrollFailed: "تعذر تسجيل العميل.",
    updateFailed: "تعذر تحديث بيانات المستخدم.",
    updated: "تم تحديث بيانات المستخدم بنجاح.",
    saving: "جارٍ الحفظ…",
  },
  nl: {
    workspace: "Cliëntwerkruimte",
    description:
      "Beheer deze cliënt zonder het account over te nemen. Elke medewerkershandeling is controleerbaar.",
    back: "Terug naar gebruikers",
    account: "Accountgegevens",
    edit: "Gegevens bewerken",
    save: "Wijzigingen opslaan",
    cancel: "Annuleren",
    name: "Volledige naam",
    email: "E-mailadres",
    username: "Gebruikersnaam",
    phone: "Telefoonnummer",
    locale: "Voorkeurstaal",
    timezone: "Tijdzone",
    channel: "Registratiekanaal",
    onsite: "Begeleid op locatie",
    online: "Online zelfservice",
    identifiers: "Inloggegevens",
    none: "Geen inloggegevens ingesteld",
    registrationId: "Registratienummer",
    created: "Account aangemaakt",
    academicEvidence: "Bewijs voor academische toelating",
    academicEvidenceHint:
      "Registreer en verifieer kwalificaties vóór de routing. Een verklaarde bachelor of gelijkwaardig sluit RPL uit.",
    addQualification: "Kwalificatie toevoegen",
    updateQualification: "Kwalificatie bijwerken",
    type: "Type kwalificatie",
    title: "Naam kwalificatie",
    institution: "Onderwijsinstelling",
    field: "Vakgebied / specialisatie",
    startDate: "Startdatum",
    completionDate: "Einddatum",
    verified: "Door medewerker geverifieerd",
    unverified: "Verificatie in afwachting",
    editQualification: "Bewerken",
    deleteQualification: "Verwijderen",
    qualificationSaved: "Kwalificatie opgeslagen en route opnieuw berekend.",
    qualificationDeleted: "Kwalificatie verwijderd en route opnieuw berekend.",
    qualificationFailed: "Kwalificatie kan niet worden opgeslagen.",
    confirmDelete: "Deze kwalificatie verwijderen?",
    routing: "Beslissing over servicerouting",
    rplWith: "RPL — met middelbareschooldiploma",
    rplWithout: "RPL — zonder middelbareschooldiploma",
    rplWithHint:
      "Ervaring en bewijs worden beoordeeld. Competentiegap-programma’s kunnen vóór accreditatie nodig zijn.",
    rplWithoutHint:
      "Ervaring en bewijs worden beoordeeld. Basis- en competentiegap-programma’s kunnen vóór accreditatie nodig zijn.",
    noRplDegree: "RPL is niet beschikbaar voor deze cliënt",
    noRplDegreeHint:
      "Er is een bachelor of gelijkwaardig academisch diploma geregistreerd. Gebruik uitsluitend Professional Qualifications.",
    pendingAcademic: "Bewijs van academische graad wacht op verificatie",
    pendingAcademicHint:
      "RPL blijft niet beschikbaar. Verifieer de graad en kies daarna een passende professionele kwalificatie.",
    pendingSecondary: "Middelbareschooldiploma wacht op verificatie",
    pendingSecondaryHint:
      "Kies de route zonder diploma niet zolang dit bewijs wordt beoordeeld.",
    startRpl: "Juiste RPL-dossier aanmaken",
    noPathway: "Het benodigde RPL-traject is nog niet geconfigureerd.",
    targetLevel: "Gewenst professioneel accreditatiedoel",
    targetLevelHint:
      "Bevestig welk niveau de aanvrager wil nastreven. Gemini beoordeelt bewijs en leerhiaten met de strengheid van dit doel.",
    selectTargetLevel:
      "Selecteer Practitioner, Advanced Practitioner of Expert",
    professional: "Professionele kwalificaties",
    professionalHint:
      "Dit is volledig gescheiden van RPL en gebruikt geverifieerde academische toelatingseisen.",
    selectProgram: "Selecteer een beschikbaar programma",
    enroll: "Inschrijven en wallet belasten",
    noPrograms:
      "Er is momenteel geen passend programma. Verifieer het academisch bewijs of voeg de ontbrekende voorwaarde toe.",
    diploma: "Professioneel diploma",
    master: "Professionele master",
    doctorate: "Professioneel doctoraat",
    cases: "Bestaande RPL-dossiers",
    noCases: "Er is geen RPL-dossier voor deze cliënt.",
    points: "punten",
    loadFailed: "De cliëntwerkruimte kan niet worden geladen.",
    createCaseFailed: "Het RPL-dossier kan niet worden aangemaakt.",
    enrollFailed: "De cliënt kan niet worden ingeschreven.",
    updateFailed: "Gebruikersgegevens kunnen niet worden bijgewerkt.",
    updated: "Gebruikersgegevens bijgewerkt.",
    saving: "Opslaan…",
  },
};

const qualificationTypes = [
  "secondary_general",
  "bachelor",
  "academic_diploma",
  "academic_master",
  "other",
];

function dateForLanguage(value, language) {
  return formatLocalizedDate(value, language);
}

function dateInput(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formFromUser(user) {
  return {
    name: user?.name || "",
    email: user?.email || "",
    username: user?.username || "",
    phone_number: user?.phone_number || "",
    preferred_locale: user?.preferred_locale || "en",
    timezone: user?.timezone || "",
  };
}

function emptyQualification() {
  return {
    qualification_type: "secondary_general",
    title: "",
    institution: "",
    field: "",
    started_on: "",
    completed_on: "",
    is_verified: false,
  };
}

function qualificationFormFrom(qualification) {
  return {
    qualification_type: qualification?.qualification_type || "other",
    title: qualification?.title || "",
    institution: qualification?.institution || "",
    field: qualification?.field || "",
    started_on: dateInput(qualification?.started_on),
    completed_on: dateInput(qualification?.completed_on),
    is_verified: Boolean(qualification?.is_verified),
  };
}

function qualificationTypeLabel(type, language) {
  const labels = {
    secondary_general: {
      en: "Secondary certificate",
      ar: "شهادة ثانوية عامة",
      nl: "Middelbareschooldiploma",
    },
    bachelor: {
      en: "Bachelor / licence / equivalent",
      ar: "بكالوريوس / ليسانس / ما يعادله",
      nl: "Bachelor / licence / gelijkwaardig",
    },
    academic_diploma: {
      en: "Academic diploma",
      ar: "دبلوم أكاديمي",
      nl: "Academisch diploma",
    },
    academic_master: {
      en: "Academic master",
      ar: "ماجستير أكاديمي",
      nl: "Academische master",
    },
    other: {
      en: "Other qualification",
      ar: "مؤهل آخر",
      nl: "Andere kwalificatie",
    },
  };
  return labels[type]?.[language] || labels.other[language];
}

function programmeTypeLabel(type, copy) {
  return type === "professional_doctorate"
    ? copy.doctorate
    : type === "professional_master"
      ? copy.master
      : copy.diploma;
}

export default function UserWorkspacePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const language = getAdminLanguage();
  const copy = copyByLanguage[language] || copyByLanguage.en;
  const { hasPermission } = useAuthorization();
  const canManageUsers = hasPermission("users.manage");
  const [state, setState] = useState({
    loading: true,
    error: "",
    message: "",
    user: null,
    pathways: [],
    programs: [],
    eligibility: null,
  });
  const [programId, setProgramId] = useState("");
  const [targetLevelId, setTargetLevelId] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(formFromUser(null));
  const [qualificationForm, setQualificationForm] =
    useState(emptyQualification());
  const [editingQualificationId, setEditingQualificationId] = useState(null);
  const [savingQualification, setSavingQualification] = useState(false);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [
        userResponse,
        referenceResponse,
        programsResponse,
        eligibilityResponse,
      ] = await Promise.all([
        fetchUser(userId),
        fetchRplReferenceData(),
        fetchAdminPrograms({ per_page: 100 }),
        fetchUserProfessionalEligibility(userId),
      ]);
      const user = unwrapApiData(userResponse);
      const reference = unwrapApiData(referenceResponse) || {};
      setProfileForm(formFromUser(user));
      setState({
        loading: false,
        error: "",
        message: "",
        user,
        pathways: unwrapCollection(reference.pathways || []),
        programs: unwrapCollection(programsResponse).filter(
          (program) => program.is_active !== false,
        ),
        eligibility: unwrapApiData(eligibilityResponse),
      });
    } catch (error) {
      setState({
        loading: false,
        error: readApiError(error, copy.loadFailed),
        message: "",
        user: null,
        pathways: [],
        programs: [],
        eligibility: null,
      });
    }
  }, [userId, copy.loadFailed]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile() {
    setSavingProfile(true);
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      const response = await updateUser(userId, profileForm);
      const user = unwrapApiData(response);
      setProfileForm(formFromUser(user));
      setEditing(false);
      setState((current) => ({
        ...current,
        user: { ...current.user, ...user },
        message: copy.updated,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: readApiError(error, copy.updateFailed),
      }));
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveQualification() {
    setSavingQualification(true);
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      if (editingQualificationId)
        await updateUserQualification(
          userId,
          editingQualificationId,
          qualificationForm,
        );
      else await createUserQualification(userId, qualificationForm);
      setQualificationForm(emptyQualification());
      setEditingQualificationId(null);
      await load();
      setState((current) => ({ ...current, message: copy.qualificationSaved }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: readApiError(error, copy.qualificationFailed),
      }));
    } finally {
      setSavingQualification(false);
    }
  }

  async function removeQualification(qualification) {
    if (!window.confirm(copy.confirmDelete)) return;
    setSavingQualification(true);
    setState((current) => ({ ...current, error: "", message: "" }));
    try {
      await deleteUserQualification(userId, qualification.id);
      if (editingQualificationId === qualification.id) {
        setQualificationForm(emptyQualification());
        setEditingQualificationId(null);
      }
      await load();
      setState((current) => ({
        ...current,
        message: copy.qualificationDeleted,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: readApiError(error, copy.qualificationFailed),
      }));
    } finally {
      setSavingQualification(false);
    }
  }

  async function startRpl(pathwayId) {
    if (!pathwayId || !targetLevelId) return;
    setBusy(true);
    try {
      const response = await createRplApplication({
        user_id: Number(userId),
        pathway_id: Number(pathwayId),
        requested_level_id: Number(targetLevelId),
      });
      const application = unwrapApiData(response);
      navigate(`/rpl/applications/${application.public_id || application.id}`);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: readApiError(error, copy.createCaseFailed),
      }));
    } finally {
      setBusy(false);
    }
  }

  async function enrollProgram() {
    if (!programId) return;
    setBusy(true);
    try {
      await enrollUserByStaff(userId, programId);
      setProgramId("");
      await load();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: readApiError(error, copy.enrollFailed),
      }));
    } finally {
      setBusy(false);
    }
  }

  const user = state.user;
  const professionalEligibility =
    state.eligibility?.professional_qualifications;
  const rplEligibility = state.eligibility?.rpl;
  const routePathway = state.pathways.find(
    (pathway) => pathway.code === rplEligibility?.recommended_pathway_code,
  );
  const eligibleProgramTypes =
    professionalEligibility?.eligible_program_types || [];
  const eligiblePrograms = state.programs.filter((program) =>
    eligibleProgramTypes.includes(program.program_type),
  );
  const setProfileField = (field, value) =>
    setProfileForm((current) => ({ ...current, [field]: value }));
  const setQualificationField = (field, value) =>
    setQualificationForm((current) => ({ ...current, [field]: value }));
  const rplIsAvailable = Boolean(rplEligibility?.eligible && routePathway);
  const rplIsDegreeBlocked =
    rplEligibility?.routing_status === "professional_qualifications_only";
  const rplIsSecondaryPending =
    rplEligibility?.routing_status === "secondary_verification_pending";
  const routeTitle =
    rplEligibility?.recommended_pathway_code === "rpl_with_secondary"
      ? copy.rplWith
      : copy.rplWithout;
  const routeHint =
    rplEligibility?.recommended_pathway_code === "rpl_with_secondary"
      ? copy.rplWithHint
      : copy.rplWithoutHint;
  const BackIcon = language === "ar" ? ArrowRight : ArrowLeft;

  return (
    <section dir={language === "ar" ? "rtl" : "ltr"} className="space-y-7">
      <PageHeader
        title={user ? `${copy.workspace} · ${user.name}` : copy.workspace}
        description={copy.description}
        actions={
          <Button variant="outline" onClick={() => navigate("/users/onsite")}>
            <BackIcon size={17} />
            {copy.back}
          </Button>
        }
      />
      {state.loading ? (
        <div className="flex justify-center p-12">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : null}
      {state.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          {state.error}
        </div>
      ) : null}
      {state.message ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
        >
          {state.message}
        </div>
      ) : null}
      {user ? (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b border-[var(--color-border)]">
              <CardTitle>{copy.account}</CardTitle>
              {canManageUsers && !editing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={16} />
                  {copy.edit}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
                    <UserRound />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold">{user.name}</h2>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      #{user.id}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                    {copy.channel}
                  </p>
                  <Badge
                    variant={
                      user.registration_channel === "onsite"
                        ? "warning"
                        : "info"
                    }
                  >
                    {user.registration_channel === "onsite"
                      ? copy.onsite
                      : copy.online}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                    {copy.identifiers}
                  </p>
                  <p className="mt-1 text-sm">
                    {[user.username, user.office_registration_id, user.email]
                      .filter(Boolean)
                      .join(" · ") || copy.none}
                  </p>
                </div>
              </div>
              {editing ? (
                <div className="grid gap-4 border-t border-[var(--color-border)] pt-6 md:grid-cols-2">
                  <Input
                    label={copy.name}
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileField("name", event.target.value)
                    }
                  />
                  <Input
                    label={copy.email}
                    type="email"
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileField("email", event.target.value)
                    }
                  />
                  <Input
                    label={copy.username}
                    value={profileForm.username}
                    onChange={(event) =>
                      setProfileField("username", event.target.value)
                    }
                  />
                  <Input
                    label={copy.phone}
                    value={profileForm.phone_number}
                    onChange={(event) =>
                      setProfileField("phone_number", event.target.value)
                    }
                  />
                  <Select
                    label={copy.locale}
                    value={profileForm.preferred_locale}
                    onChange={(event) =>
                      setProfileField("preferred_locale", event.target.value)
                    }
                  >
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                    <option value="nl">Nederlands</option>
                  </Select>
                  <Input
                    label={copy.timezone}
                    placeholder="Asia/Damascus"
                    value={profileForm.timezone}
                    onChange={(event) =>
                      setProfileField("timezone", event.target.value)
                    }
                  />
                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <Button onClick={saveProfile} disabled={savingProfile}>
                      {savingProfile ? (
                        <LoaderCircle className="animate-spin" size={17} />
                      ) : (
                        <Save size={17} />
                      )}
                      {savingProfile ? copy.saving : copy.save}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={savingProfile}
                      onClick={() => {
                        setProfileForm(formFromUser(user));
                        setEditing(false);
                      }}
                    >
                      {copy.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 border-t border-[var(--color-border)] pt-6 text-sm md:grid-cols-3">
                  <p>
                    <span className="block text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                      {copy.email}
                    </span>
                    {user.email || "—"}
                  </p>
                  <p>
                    <span className="block text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                      {copy.phone}
                    </span>
                    {user.phone_number || "—"}
                  </p>
                  <p>
                    <span className="block text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                      {copy.registrationId}
                    </span>
                    {user.office_registration_id || "—"}
                  </p>
                  <p>
                    <span className="block text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                      {copy.created}
                    </span>
                    {dateForLanguage(user.created_at, language)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--color-border)]">
              <CardTitle>{copy.academicEvidence}</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {copy.academicEvidenceHint}
              </p>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              {(user.qualifications || []).length ? (
                <div className="grid gap-3">
                  {user.qualifications.map((qualification) => (
                    <div
                      key={qualification.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--color-border)] p-4 md:flex-row md:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{qualification.title}</strong>
                          <Badge
                            variant={
                              qualification.is_verified ? "success" : "warning"
                            }
                          >
                            {qualification.is_verified
                              ? copy.verified
                              : copy.unverified}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          {qualificationTypeLabel(
                            qualification.qualification_type,
                            language,
                          )}{" "}
                          · {qualification.institution}
                          {qualification.field
                            ? ` · ${qualification.field}`
                            : ""}
                        </p>
                      </div>
                      {canManageUsers ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingQualificationId(qualification.id);
                              setQualificationForm(
                                qualificationFormFrom(qualification),
                              );
                            }}
                          >
                            <Pencil size={15} />
                            {copy.editQualification}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={savingQualification}
                            onClick={() => removeQualification(qualification)}
                          >
                            <Trash2 size={15} />
                            {copy.deleteQualification}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {canManageUsers ? (
                <div className="grid gap-4 rounded-xl border border-sky-200 bg-sky-50/60 p-5 md:grid-cols-2">
                  <Select
                    label={copy.type}
                    value={qualificationForm.qualification_type}
                    onChange={(event) =>
                      setQualificationField(
                        "qualification_type",
                        event.target.value,
                      )
                    }
                  >
                    {qualificationTypes.map((type) => (
                      <option key={type} value={type}>
                        {qualificationTypeLabel(type, language)}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label={copy.title}
                    value={qualificationForm.title}
                    onChange={(event) =>
                      setQualificationField("title", event.target.value)
                    }
                  />
                  <Input
                    label={copy.institution}
                    value={qualificationForm.institution}
                    onChange={(event) =>
                      setQualificationField("institution", event.target.value)
                    }
                  />
                  <Input
                    label={copy.field}
                    value={qualificationForm.field}
                    onChange={(event) =>
                      setQualificationField("field", event.target.value)
                    }
                  />
                  <Input
                    label={copy.startDate}
                    type="date"
                    value={qualificationForm.started_on}
                    onChange={(event) =>
                      setQualificationField("started_on", event.target.value)
                    }
                  />
                  <Input
                    label={copy.completionDate}
                    type="date"
                    value={qualificationForm.completed_on}
                    onChange={(event) =>
                      setQualificationField("completed_on", event.target.value)
                    }
                  />
                  <label className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={qualificationForm.is_verified}
                      onChange={(event) =>
                        setQualificationField(
                          "is_verified",
                          event.target.checked,
                        )
                      }
                    />
                    {copy.verified}
                  </label>
                  <div className="flex flex-wrap items-end gap-3">
                    <Button
                      onClick={saveQualification}
                      disabled={
                        savingQualification ||
                        !qualificationForm.title.trim() ||
                        !qualificationForm.institution.trim()
                      }
                    >
                      {savingQualification ? (
                        <LoaderCircle className="animate-spin" size={17} />
                      ) : (
                        <GraduationCap size={17} />
                      )}
                      {editingQualificationId
                        ? copy.updateQualification
                        : copy.addQualification}
                    </Button>
                    {editingQualificationId ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingQualificationId(null);
                          setQualificationForm(emptyQualification());
                        }}
                      >
                        {copy.cancel}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--color-border)]">
              <CardTitle>{copy.routing}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 p-6 lg:grid-cols-2">
              <div
                className={`rounded-2xl border p-5 ${rplIsAvailable ? "border-sky-200 bg-sky-50" : rplIsDegreeBlocked ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">
                      {rplIsAvailable
                        ? routeTitle
                        : rplIsDegreeBlocked
                          ? copy.noRplDegree
                          : rplIsSecondaryPending
                            ? copy.pendingSecondary
                            : copy.noPathway}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                      {rplIsAvailable
                        ? routeHint
                        : rplIsDegreeBlocked
                          ? rplEligibility?.has_pending_academic_degree_verification
                            ? copy.pendingAcademicHint
                            : copy.noRplDegreeHint
                          : rplIsSecondaryPending
                            ? copy.pendingSecondaryHint
                            : copy.noPathway}
                    </p>
                  </div>
                  {rplIsAvailable ? (
                    <Badge variant="info">RPL</Badge>
                  ) : (
                    <Badge variant={rplIsDegreeBlocked ? "warning" : "neutral"}>
                      {rplIsDegreeBlocked ? copy.professional : copy.unverified}
                    </Badge>
                  )}
                </div>
                {rplIsAvailable ? (
                  <div className="mt-5 space-y-3">
                    <Select
                      label={copy.targetLevel}
                      value={targetLevelId}
                      onChange={(event) => setTargetLevelId(event.target.value)}
                    >
                      <option value="">{copy.selectTargetLevel}</option>
                      {(routePathway.levels || []).map((level) => (
                        <option key={level.id} value={level.id}>
                          {localize(level.name, language)}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                      {copy.targetLevelHint}
                    </p>
                    <Button
                      onClick={() => startRpl(routePathway.id)}
                      disabled={busy || !targetLevelId}
                    >
                      {busy ? (
                        <LoaderCircle className="animate-spin" size={17} />
                      ) : (
                        <FilePlus2 size={17} />
                      )}
                      {copy.startRpl}
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{copy.professional}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                      {copy.professionalHint}
                    </p>
                  </div>
                  <Badge variant="success">
                    <CheckCircle2 size={14} />
                  </Badge>
                </div>
                <p className="mt-4 text-sm font-medium">
                  {professionalEligibility?.recommended_program_type
                    ? `${copy[professionalEligibility.recommended_program_type.replace("professional_", "")] || professionalEligibility.recommended_program_type}`
                    : copy.noPrograms}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--color-border)]">
              <CardTitle>{copy.professional}</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {copy.professionalHint}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-end">
              <Select
                className="flex-1"
                label={copy.selectProgram}
                value={programId}
                onChange={(event) => setProgramId(event.target.value)}
                disabled={!eligiblePrograms.length}
              >
                <option value="">{copy.selectProgram}</option>
                {eligiblePrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {programmeTypeLabel(program.program_type, copy)} ·{" "}
                    {localize(program.title, language)} ·{" "}
                    {formatLocalizedNumber(program.price_points || 0, language)}{" "}
                    {copy.points}
                  </option>
                ))}
              </Select>
              <Button onClick={enrollProgram} disabled={!programId || busy}>
                {busy ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <FilePlus2 size={17} />
                )}
                {copy.enroll}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--color-border)]">
              <CardTitle>{copy.cases}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {(user.rpl_applications || []).length ? (
                user.rpl_applications.map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/rpl/applications/${application.public_id || application.id}`,
                      )
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] p-4 text-start hover:bg-[var(--color-surface-muted)]"
                  >
                    <span>
                      <bdi className="font-bold">
                        {application.case_reference}
                      </bdi>
                      <span className="ms-2 text-sm text-[var(--color-text-muted)]">
                        {localize(application.pathway?.name, language)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      <FolderOpen size={16} />
                      <RplStatusBadge
                        status={application.status}
                        language={language}
                      />
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  {copy.noCases}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
