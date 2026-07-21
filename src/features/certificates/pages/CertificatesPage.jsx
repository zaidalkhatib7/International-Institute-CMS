import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Download,
  Eye,
  FileBadge,
  FilePlus2,
  RotateCcw,
  Search,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTableShell,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "../../../components/ui";
import {
  readApiError,
  readPagination,
  readLocalized,
  unwrapApiData,
  unwrapCollection,
} from "../../../services/apiResponse";
import { getAdminLanguage } from "../../../services/languageStorage";
import { formatLocalizedDateTime } from "../../../utils/localization";
import { useAuthorization } from "../../auth/context/useAuthorization";
import {
  EmptyState,
  MetricTile,
  OperationAlert,
  OperationsLoader,
  OperationsModal,
  OperationsTabs,
  PaginationControls,
  StatusBadge,
} from "../../operations/components/OperationsUI";
import {
  createCertificateTemplate,
  downloadCertificate,
  fetchCertificate,
  fetchCertificates,
  fetchCertificateTemplates,
  issueCertificate,
  reissueCertificate,
  revokeCertificate,
  updateCertificateTemplate,
} from "../services/certificatesService";

const copyByLanguage = {
  ar: {
    title: "إدارة الشهادات",
    description:
      "إصدار الشهادات المهنية والتحقق منها وإدارة القوالب وسجل الإلغاء وإعادة الإصدار.",
    registry: "سجل الشهادات",
    templates: "قوالب الشهادات",
    issue: "إصدار شهادة",
    newTemplate: "قالب جديد",
    search: "ابحث بالرقم أو اسم المستفيد…",
    allStatuses: "كل الحالات",
    apply: "تطبيق",
    certificate: "الشهادة",
    recipient: "المستفيد",
    credential: "المؤهل",
    issued: "تاريخ الإصدار",
    status: "الحالة",
    actions: "الإجراءات",
    empty: "لا توجد شهادات مطابقة.",
    emptyDescription: "غيّر عوامل التصفية أو أصدر شهادة جديدة.",
    loadingError: "تعذر تحميل سجل الشهادات.",
    issuedSuccess: "تم إصدار الشهادة بنجاح.",
    templateSuccess: "تم حفظ قالب الشهادة.",
    actionSuccess: "تم تحديث دورة حياة الشهادة.",
    total: "إجمالي السجل",
    active: "شهادات فعالة",
    revoked: "ملغاة أو مستبدلة",
    templateCount: "القوالب",
    view: "عرض",
    download: "PDF",
    revoke: "إلغاء",
    reissue: "إعادة إصدار",
    close: "إغلاق",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    details: "تفاصيل الشهادة",
    verification: "رمز التحقق",
    noToken: "يظهر رمز التحقق بعد تحميل التفاصيل.",
    userId: "معرّف المستخدم",
    programId: "معرّف البرنامج (اختياري)",
    template: "القالب",
    credentialEn: "اسم المؤهل بالإنجليزية",
    credentialAr: "اسم المؤهل بالعربية",
    credentialNl: "اسم المؤهل بالهولندية",
    issuanceKey: "مفتاح إصدار اختياري",
    reason: "سبب الإجراء",
    reasonHint: "اكتب سبباً واضحاً وقابلاً للتدقيق.",
    templateCode: "رمز القالب",
    templateNameEn: "اسم القالب بالإنجليزية",
    templateNameAr: "اسم القالب بالعربية",
    templateNameNl: "اسم القالب بالهولندية",
    titleEn: "عنوان الشهادة بالإنجليزية",
    titleAr: "عنوان الشهادة بالعربية",
    titleNl: "عنوان الشهادة بالهولندية",
    bodyEn: "نص الشهادة بالإنجليزية",
    bodyAr: "نص الشهادة بالعربية",
    bodyNl: "نص الشهادة بالهولندية",
    prefix: "بادئة الرقم",
    padding: "عدد الخانات",
    orientation: "الاتجاه",
    landscape: "أفقي",
    portrait: "عمودي",
    default: "القالب الافتراضي",
    enabled: "نشط",
    edit: "تعديل",
    previous: "السابق",
    next: "التالي",
    required: "أكمل الحقول المطلوبة.",
    activeStatus: "فعال",
    revokedStatus: "ملغى",
    supersededStatus: "مستبدل",
    expiredStatus: "منتهي",
  },
  en: {
    title: "Certificate administration",
    description:
      "Issue professional credentials, verify lifecycle history, and maintain governed certificate templates.",
    registry: "Certificate registry",
    templates: "Certificate templates",
    issue: "Issue certificate",
    newTemplate: "New template",
    search: "Search number or recipient…",
    allStatuses: "All statuses",
    apply: "Apply",
    certificate: "Certificate",
    recipient: "Recipient",
    credential: "Credential",
    issued: "Issued",
    status: "Status",
    actions: "Actions",
    empty: "No matching certificates.",
    emptyDescription: "Adjust the filters or issue a new credential.",
    loadingError: "The certificate registry could not be loaded.",
    issuedSuccess: "Certificate issued successfully.",
    templateSuccess: "Certificate template saved.",
    actionSuccess: "Certificate lifecycle updated.",
    total: "Registry total",
    active: "Active credentials",
    revoked: "Revoked or replaced",
    templateCount: "Templates",
    view: "View",
    download: "PDF",
    revoke: "Revoke",
    reissue: "Reissue",
    close: "Close",
    save: "Save",
    saving: "Saving…",
    details: "Certificate details",
    verification: "Verification token",
    noToken: "The verification token appears after loading details.",
    userId: "User ID",
    programId: "Program ID (optional)",
    template: "Template",
    credentialEn: "Credential name in English",
    credentialAr: "Credential name in Arabic",
    credentialNl: "Credential name in Dutch",
    issuanceKey: "Optional issuance key",
    reason: "Action reason",
    reasonHint: "Enter a clear, auditable reason.",
    templateCode: "Template code",
    templateNameEn: "Template name in English",
    templateNameAr: "Template name in Arabic",
    templateNameNl: "Template name in Dutch",
    titleEn: "Certificate title in English",
    titleAr: "Certificate title in Arabic",
    titleNl: "Certificate title in Dutch",
    bodyEn: "Certificate body in English",
    bodyAr: "Certificate body in Arabic",
    bodyNl: "Certificate body in Dutch",
    prefix: "Number prefix",
    padding: "Number padding",
    orientation: "Orientation",
    landscape: "Landscape",
    portrait: "Portrait",
    default: "Default template",
    enabled: "Active",
    edit: "Edit",
    previous: "Previous",
    next: "Next",
    required: "Complete all required fields.",
    activeStatus: "Active",
    revokedStatus: "Revoked",
    supersededStatus: "Superseded",
    expiredStatus: "Expired",
  },
  nl: {
    title: "Certificaatbeheer",
    description:
      "Geef professionele certificaten uit, beheer de levenscyclus en onderhoud gecontroleerde sjablonen.",
    registry: "Certificaatregister",
    templates: "Certificaatsjablonen",
    issue: "Certificaat uitgeven",
    newTemplate: "Nieuw sjabloon",
    search: "Zoek nummer of ontvanger…",
    allStatuses: "Alle statussen",
    apply: "Toepassen",
    certificate: "Certificaat",
    recipient: "Ontvanger",
    credential: "Kwalificatie",
    issued: "Uitgegeven",
    status: "Status",
    actions: "Acties",
    empty: "Geen certificaten gevonden.",
    emptyDescription: "Pas de filters aan of geef een nieuw certificaat uit.",
    loadingError: "Het certificaatregister kon niet worden geladen.",
    issuedSuccess: "Certificaat succesvol uitgegeven.",
    templateSuccess: "Certificaatsjabloon opgeslagen.",
    actionSuccess: "Levenscyclus van certificaat bijgewerkt.",
    total: "Totaal register",
    active: "Actieve certificaten",
    revoked: "Ingetrokken of vervangen",
    templateCount: "Sjablonen",
    view: "Bekijken",
    download: "PDF",
    revoke: "Intrekken",
    reissue: "Opnieuw uitgeven",
    close: "Sluiten",
    save: "Opslaan",
    saving: "Opslaan…",
    details: "Certificaatdetails",
    verification: "Verificatietoken",
    noToken: "De verificatietoken verschijnt na het laden van details.",
    userId: "Gebruikers-ID",
    programId: "Programma-ID (optioneel)",
    template: "Sjabloon",
    credentialEn: "Naam kwalificatie in het Engels",
    credentialAr: "Naam kwalificatie in het Arabisch",
    credentialNl: "Naam kwalificatie in het Nederlands",
    issuanceKey: "Optionele uitgiftesleutel",
    reason: "Reden",
    reasonHint: "Voer een duidelijke, controleerbare reden in.",
    templateCode: "Sjablooncode",
    templateNameEn: "Sjabloonnaam in het Engels",
    templateNameAr: "Sjabloonnaam in het Arabisch",
    templateNameNl: "Sjabloonnaam in het Nederlands",
    titleEn: "Certificaattitel in het Engels",
    titleAr: "Certificaattitel in het Arabisch",
    titleNl: "Certificaattitel in het Nederlands",
    bodyEn: "Certificaattekst in het Engels",
    bodyAr: "Certificaattekst in het Arabisch",
    bodyNl: "Certificaattekst in het Nederlands",
    prefix: "Nummerprefix",
    padding: "Aantal cijfers",
    orientation: "Oriëntatie",
    landscape: "Liggend",
    portrait: "Staand",
    default: "Standaardsjabloon",
    enabled: "Actief",
    edit: "Bewerken",
    previous: "Vorige",
    next: "Volgende",
    required: "Vul alle verplichte velden in.",
    activeStatus: "Actief",
    revokedStatus: "Ingetrokken",
    supersededStatus: "Vervangen",
    expiredStatus: "Verlopen",
  },
};

const emptyIssue = {
  user_id: "",
  program_id: "",
  certificate_template_id: "",
  credential_en: "",
  credential_ar: "",
  credential_nl: "",
  issuance_key: "",
};
const emptyTemplate = {
  id: null,
  code: "",
  name_en: "",
  name_ar: "",
  name_nl: "",
  title_en: "",
  title_ar: "",
  title_nl: "",
  body_en: "",
  body_ar: "",
  body_nl: "",
  number_prefix: "ICPC",
  number_padding: 6,
  orientation: "landscape",
  is_default: false,
  is_active: true,
};

function localizedCredential(certificate, language) {
  return (
    readLocalized(
      certificate?.snapshot?.credential?.title ||
        certificate?.snapshot?.credential,
      language,
    ) || "—"
  );
}

function toTemplateForm(template = {}) {
  return {
    id: template.id || null,
    code: template.code || "",
    name_en: template.name?.en || "",
    name_ar: template.name?.ar || "",
    name_nl: template.name?.nl || "",
    title_en: template.title?.en || "",
    title_ar: template.title?.ar || "",
    title_nl: template.title?.nl || "",
    body_en: template.body?.en || "",
    body_ar: template.body?.ar || "",
    body_nl: template.body?.nl || "",
    number_prefix: template.number_prefix || "ICPC",
    number_padding: template.number_padding || 6,
    orientation: template.orientation || "landscape",
    is_default: Boolean(template.is_default),
    is_active: template.is_active !== false,
  };
}

export default function CertificatesPage() {
  const { hasPermission } = useAuthorization();
  const canManageCertificates = hasPermission("certificates.manage");
  const canManageTemplates = hasPermission("certificate_templates.manage");
  const language = getAdminLanguage();
  const isArabic = language === "ar";
  const copy = copyByLanguage[language] || copyByLanguage.en;
  const [tab, setTab] = useState("registry");
  const [certificates, setCertificates] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [issueForm, setIssueForm] = useState(emptyIssue);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");

  const loadRegistry = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError("");
      try {
        const [registryPayload, templatePayload] = await Promise.all([
          fetchCertificates({ ...appliedFilters, page, per_page: 20 }),
          canManageTemplates
            ? fetchCertificateTemplates()
            : Promise.resolve(null),
        ]);
        setCertificates(unwrapCollection(registryPayload));
        setPagination(readPagination(registryPayload));
        setTemplates(
          canManageTemplates ? unwrapCollection(templatePayload) : [],
        );
      } catch (requestError) {
        setError(readApiError(requestError, copy.loadingError));
      } finally {
        setIsLoading(false);
      }
    },
    [appliedFilters, canManageTemplates, copy.loadingError],
  );

  useEffect(() => {
    loadRegistry(1);
  }, [loadRegistry]);

  const metrics = useMemo(
    () => ({
      total: pagination?.total ?? certificates.length,
      active: certificates.filter((item) => item.status === "active").length,
      revoked: certificates.filter((item) =>
        ["revoked", "superseded"].includes(item.status),
      ).length,
    }),
    [certificates, pagination],
  );
  const statuses = {
    active: copy.activeStatus,
    revoked: copy.revokedStatus,
    superseded: copy.supersededStatus,
    expired: copy.expiredStatus,
  };

  async function handleIssue(event) {
    event.preventDefault();
    if (!issueForm.user_id || !issueForm.credential_en) {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const payload = {
        user_id: Number(issueForm.user_id),
        credential: {
          title: {
            en: issueForm.credential_en,
            ar: issueForm.credential_ar,
            nl: issueForm.credential_nl,
          },
        },
      };
      if (issueForm.program_id)
        payload.program_id = Number(issueForm.program_id);
      if (issueForm.certificate_template_id)
        payload.certificate_template_id = Number(
          issueForm.certificate_template_id,
        );
      if (issueForm.issuance_key.trim())
        payload.issuance_key = issueForm.issuance_key.trim();
      await issueCertificate(payload);
      setModal(null);
      setIssueForm(emptyIssue);
      setSuccess(copy.issuedSuccess);
      await loadRegistry(1);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTemplate(event) {
    event.preventDefault();
    if (!templateForm.code || !templateForm.name_en || !templateForm.title_en) {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    setError("");
    const payload = {
      code: templateForm.code,
      name: {
        en: templateForm.name_en,
        ar: templateForm.name_ar,
        nl: templateForm.name_nl,
      },
      title: {
        en: templateForm.title_en,
        ar: templateForm.title_ar,
        nl: templateForm.title_nl,
      },
      body: {
        en: templateForm.body_en,
        ar: templateForm.body_ar,
        nl: templateForm.body_nl,
      },
      number_prefix: templateForm.number_prefix,
      number_padding: Number(templateForm.number_padding),
      orientation: templateForm.orientation,
      is_default: templateForm.is_default,
      is_active: templateForm.is_active,
    };
    try {
      if (templateForm.id)
        await updateCertificateTemplate(templateForm.id, payload);
      else await createCertificateTemplate(payload);
      setModal(null);
      setTemplateForm(emptyTemplate);
      setSuccess(copy.templateSuccess);
      await loadRegistry(pagination?.currentPage || 1);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openDetails(certificate) {
    setModal("details");
    setSelected(certificate);
    setError("");
    try {
      const payload = await fetchCertificate(certificate.id);
      setSelected({
        ...unwrapApiData(payload),
        verification_token: payload?.verification_token,
      });
    } catch (requestError) {
      setError(readApiError(requestError));
    }
  }

  async function handleLifecycle() {
    if (!reason.trim() || !selected) {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      if (modal === "revoke")
        await revokeCertificate(selected.id, reason.trim());
      else await reissueCertificate(selected.id, reason.trim());
      setModal(null);
      setReason("");
      setSelected(null);
      setSuccess(copy.actionSuccess);
      await loadRegistry(pagination?.currentPage || 1);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownload(certificate) {
    setError("");
    try {
      const response = await downloadCertificate(certificate.id);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${certificate.number}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(readApiError(requestError));
    }
  }

  const columns = [
    {
      key: "number",
      label: copy.certificate,
      render: (row) => (
        <div>
          <p className="font-bold text-[var(--color-primary)]">{row.number}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {row.template?.code || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "recipient",
      label: copy.recipient,
      render: (row) => (
        <div>
          <p className="font-semibold">
            {row.user?.name || row.snapshot?.recipient?.name || "—"}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {row.user?.email || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "credential",
      label: copy.credential,
      render: (row) => localizedCredential(row, language),
    },
    {
      key: "issued_at",
      label: copy.issued,
      render: (row) =>
        row.issued_at ? formatLocalizedDateTime(row.issued_at, language) : "—",
    },
    {
      key: "status",
      label: copy.status,
      render: (row) => <StatusBadge value={row.status} labels={statuses} />,
    },
    {
      key: "actions",
      label: copy.actions,
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => openDetails(row)}>
            <Eye size={15} />
            {copy.view}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDownload(row)}>
            <Download size={15} />
            {copy.download}
          </Button>
          {canManageCertificates && row.status === "active" ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setSelected(row);
                setReason("");
                setModal("revoke");
              }}
            >
              {copy.revoke}
            </Button>
          ) : null}
          {canManageCertificates ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelected(row);
                setReason("");
                setModal("reissue");
              }}
            >
              <RotateCcw size={15} />
              {copy.reissue}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className={`space-y-7 ${isArabic ? "text-right" : "text-left"}`}
    >
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          canManageCertificates ? (
            <Button
              onClick={() => {
                setIssueForm(emptyIssue);
                setModal("issue");
              }}
            >
              <FilePlus2 size={18} />
              {copy.issue}
            </Button>
          ) : null
        }
      />
      <OperationAlert message={error} onDismiss={() => setError("")} />
      <OperationAlert
        tone="success"
        message={success}
        onDismiss={() => setSuccess("")}
      />
      <OperationsTabs
        value={tab}
        onChange={setTab}
        items={[
          {
            value: "registry",
            label: copy.registry,
            icon: Award,
            count: pagination?.total,
          },
          ...(canManageTemplates
            ? [
                {
                  value: "templates",
                  label: copy.templates,
                  icon: FileBadge,
                  count: templates.length,
                },
              ]
            : []),
        ]}
      />

      {isLoading ? (
        <OperationsLoader />
      ) : tab === "registry" ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={Award} label={copy.total} value={metrics.total} />
            <MetricTile
              icon={ShieldCheck}
              label={copy.active}
              value={metrics.active}
              variant="success"
            />
            <MetricTile
              icon={RotateCcw}
              label={copy.revoked}
              value={metrics.revoked}
              variant="warning"
            />
            {canManageTemplates ? (
              <MetricTile
                icon={Stamp}
                label={copy.templateCount}
                value={templates.length}
              />
            ) : null}
          </div>
          <Card>
            <CardContent className="pt-6">
              <form
                className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAppliedFilters(filters);
                }}
              >
                <Input
                  value={filters.q}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      q: event.target.value,
                    }))
                  }
                  placeholder={copy.search}
                  leftIcon={<Search size={17} />}
                />
                <Select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="">{copy.allStatuses}</option>
                  {["active", "revoked", "superseded", "expired"].map(
                    (status) => (
                      <option key={status} value={status}>
                        {statuses[status]}
                      </option>
                    ),
                  )}
                </Select>
                <Button type="submit">{copy.apply}</Button>
              </form>
            </CardContent>
          </Card>
          {certificates.length ? (
            <>
              <DataTableShell
                title={copy.registry}
                columns={columns}
                rows={certificates}
              />
              <PaginationControls
                pagination={pagination}
                onPageChange={loadRegistry}
                previousLabel={copy.previous}
                nextLabel={copy.next}
              />
            </>
          ) : (
            <Card>
              <EmptyState
                icon={Award}
                title={copy.empty}
                description={copy.emptyDescription}
                action={
                  canManageCertificates ? (
                    <Button onClick={() => setModal("issue")}>
                      {copy.issue}
                    </Button>
                  ) : null
                }
              />
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-5 flex justify-end">
              <Button
                onClick={() => {
                  setTemplateForm(emptyTemplate);
                  setModal("template");
                }}
              >
                <FilePlus2 size={18} />
                {copy.newTemplate}
              </Button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {templates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => {
                    setTemplateForm(toTemplateForm(template));
                    setModal("template");
                  }}
                  className="rounded-2xl border border-[var(--color-border)] p-5 text-start transition hover:border-[var(--color-primary)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--color-primary)]">
                        {readLocalized(template.name, language)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {template.code} · {template.number_prefix}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {template.is_default ? (
                        <Badge variant="secondary">{copy.default}</Badge>
                      ) : null}
                      <StatusBadge
                        value={template.is_active ? "active" : "archived"}
                        labels={statuses}
                      />
                    </div>
                  </div>
                  <p className="mt-4 text-sm">
                    {readLocalized(template.title, language)}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[var(--color-primary)]">
                    {copy.edit}
                  </p>
                </button>
              ))}
              {templates.length === 0 ? (
                <EmptyState icon={FileBadge} title={copy.empty} />
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <OperationsModal
        open={modal === "issue"}
        title={copy.issue}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {copy.close}
            </Button>
            <Button
              type="submit"
              form="certificate-issue-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? copy.saving : copy.issue}
            </Button>
          </>
        }
      >
        <form
          id="certificate-issue-form"
          className="grid gap-5 md:grid-cols-2"
          onSubmit={handleIssue}
        >
          <Input
            label={copy.userId}
            type="number"
            min="1"
            required
            value={issueForm.user_id}
            onChange={(event) =>
              setIssueForm((current) => ({
                ...current,
                user_id: event.target.value,
              }))
            }
          />
          <Input
            label={copy.programId}
            type="number"
            min="1"
            value={issueForm.program_id}
            onChange={(event) =>
              setIssueForm((current) => ({
                ...current,
                program_id: event.target.value,
              }))
            }
          />
          <Select
            label={copy.template}
            value={issueForm.certificate_template_id}
            onChange={(event) =>
              setIssueForm((current) => ({
                ...current,
                certificate_template_id: event.target.value,
              }))
            }
          >
            <option value="">—</option>
            {templates
              .filter((template) => template.is_active)
              .map((template) => (
                <option key={template.id} value={template.id}>
                  {readLocalized(template.name, language)}
                </option>
              ))}
          </Select>
          <Input
            label={copy.issuanceKey}
            value={issueForm.issuance_key}
            onChange={(event) =>
              setIssueForm((current) => ({
                ...current,
                issuance_key: event.target.value,
              }))
            }
          />
          <Input
            className="md:col-span-2"
            label={copy.credentialEn}
            required
            value={issueForm.credential_en}
            onChange={(event) =>
              setIssueForm((current) => ({
                ...current,
                credential_en: event.target.value,
              }))
            }
          />
          <Input
            label={copy.credentialAr}
            dir="rtl"
            value={issueForm.credential_ar}
            onChange={(event) =>
              setIssueForm((current) => ({
                ...current,
                credential_ar: event.target.value,
              }))
            }
          />
          <Input
            label={copy.credentialNl}
            value={issueForm.credential_nl}
            onChange={(event) =>
              setIssueForm((current) => ({
                ...current,
                credential_nl: event.target.value,
              }))
            }
          />
        </form>
      </OperationsModal>

      <OperationsModal
        open={modal === "template"}
        title={templateForm.id ? copy.edit : copy.newTemplate}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {copy.close}
            </Button>
            <Button
              type="submit"
              form="certificate-template-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? copy.saving : copy.save}
            </Button>
          </>
        }
      >
        <form
          id="certificate-template-form"
          className="grid gap-5 md:grid-cols-2"
          onSubmit={handleTemplate}
        >
          <Input
            label={copy.templateCode}
            required
            value={templateForm.code}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                code: event.target.value,
              }))
            }
          />
          <Input
            label={copy.prefix}
            required
            value={templateForm.number_prefix}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                number_prefix: event.target.value,
              }))
            }
          />
          <Input
            label={copy.templateNameEn}
            required
            value={templateForm.name_en}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                name_en: event.target.value,
              }))
            }
          />
          <Input
            label={copy.templateNameAr}
            dir="rtl"
            value={templateForm.name_ar}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                name_ar: event.target.value,
              }))
            }
          />
          <Input
            label={copy.templateNameNl}
            value={templateForm.name_nl}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                name_nl: event.target.value,
              }))
            }
          />
          <Input
            label={copy.titleEn}
            required
            value={templateForm.title_en}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                title_en: event.target.value,
              }))
            }
          />
          <Input
            label={copy.titleAr}
            dir="rtl"
            value={templateForm.title_ar}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                title_ar: event.target.value,
              }))
            }
          />
          <Input
            label={copy.titleNl}
            value={templateForm.title_nl}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                title_nl: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.bodyEn}
            value={templateForm.body_en}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                body_en: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.bodyAr}
            dir="rtl"
            value={templateForm.body_ar}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                body_ar: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.bodyNl}
            value={templateForm.body_nl}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                body_nl: event.target.value,
              }))
            }
          />
          <Input
            label={copy.padding}
            type="number"
            min="3"
            max="12"
            value={templateForm.number_padding}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                number_padding: event.target.value,
              }))
            }
          />
          <Select
            label={copy.orientation}
            value={templateForm.orientation}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                orientation: event.target.value,
              }))
            }
          >
            <option value="landscape">{copy.landscape}</option>
            <option value="portrait">{copy.portrait}</option>
          </Select>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={templateForm.is_default}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  is_default: event.target.checked,
                }))
              }
            />
            {copy.default}
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={templateForm.is_active}
              onChange={(event) =>
                setTemplateForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
            />
            {copy.enabled}
          </label>
        </form>
      </OperationsModal>

      <OperationsModal
        open={modal === "details"}
        title={copy.details}
        onClose={() => setModal(null)}
        footer={
          <Button variant="outline" onClick={() => setModal(null)}>
            {copy.close}
          </Button>
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="grid gap-4 rounded-2xl bg-[var(--color-surface-muted)] p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {copy.certificate}
                </p>
                <p className="mt-1 font-bold">{selected.number}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {copy.status}
                </p>
                <div className="mt-1">
                  <StatusBadge value={selected.status} labels={statuses} />
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {copy.recipient}
                </p>
                <p className="mt-1 font-semibold">
                  {selected.user?.name || selected.snapshot?.recipient?.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {copy.credential}
                </p>
                <p className="mt-1 font-semibold">
                  {localizedCredential(selected, language)}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">{copy.verification}</p>
              <code className="block break-all rounded-xl border border-[var(--color-border)] bg-white p-4 text-xs">
                {selected.verification_token || copy.noToken}
              </code>
            </div>
          </div>
        ) : null}
      </OperationsModal>

      <OperationsModal
        open={modal === "revoke" || modal === "reissue"}
        title={modal === "revoke" ? copy.revoke : copy.reissue}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {copy.close}
            </Button>
            <Button
              variant={modal === "revoke" ? "danger" : "primary"}
              disabled={isSubmitting}
              onClick={handleLifecycle}
            >
              {isSubmitting
                ? copy.saving
                : modal === "revoke"
                  ? copy.revoke
                  : copy.reissue}
            </Button>
          </>
        }
      >
        <Textarea
          label={copy.reason}
          hint={copy.reasonHint}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={5}
          required
        />
      </OperationsModal>
    </section>
  );
}
