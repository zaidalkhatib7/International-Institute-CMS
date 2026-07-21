import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BookOpen,
  Boxes,
  FilePlus2,
  FolderTree,
  Globe2,
  LibraryBig,
  Plus,
  Search,
  UploadCloud,
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
  readLocalized,
  readPagination,
  unwrapApiData,
  unwrapCollection,
} from "../../../services/apiResponse";
import { getAdminLanguage } from "../../../services/languageStorage";
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
  addLibraryVersion,
  archiveLibraryResource,
  createLibraryCategory,
  createLibraryResource,
  deleteLibraryCategory,
  fetchLibraryCategories,
  fetchLibraryResource,
  fetchLibraryResources,
  publishLibraryVersion,
  updateLibraryCategory,
  updateLibraryResource,
} from "../services/libraryService";

const copies = {
  ar: {
    title: "المكتبة الرقمية",
    description:
      "إدارة السياسات والأدلة والنماذج والبحوث مع إصدارات محكومة وصلاحيات وصول واضحة.",
    resources: "المصادر",
    categories: "التصنيفات",
    newResource: "مصدر جديد",
    newCategory: "تصنيف جديد",
    search: "ابحث في عنوان أو وصف أو كلمات مفتاحية…",
    allStatuses: "كل الحالات",
    allTypes: "كل الأنواع",
    allAccess: "كل مستويات الوصول",
    apply: "تطبيق",
    resource: "المصدر",
    category: "التصنيف",
    type: "النوع",
    access: "الوصول",
    version: "الإصدار",
    status: "الحالة",
    actions: "الإجراءات",
    versions: "إدارة الإصدارات",
    edit: "تعديل",
    archive: "أرشفة",
    total: "إجمالي المصادر",
    published: "منشور",
    draft: "مسودة",
    restricted: "وصول مقيّد",
    empty: "لا توجد مصادر مطابقة.",
    emptyCategories: "لا توجد تصنيفات بعد.",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    close: "إغلاق",
    required: "أكمل الحقول المطلوبة.",
    success: "تم حفظ بيانات المكتبة.",
    archived: "تمت أرشفة المصدر.",
    versionAdded: "تمت إضافة الإصدار.",
    versionPublished: "تم نشر الإصدار المحدد.",
    deleted: "تم حذف التصنيف.",
    slug: "الرابط المختصر",
    titleEn: "العنوان بالإنجليزية",
    titleAr: "العنوان بالعربية",
    titleNl: "العنوان بالهولندية",
    descriptionEn: "الوصف بالإنجليزية",
    descriptionAr: "الوصف بالعربية",
    authors: "المؤلفون (مفصولون بفواصل)",
    keywords: "الكلمات المفتاحية (مفصولة بفواصل)",
    language: "لغة المصدر",
    publisher: "الناشر",
    publishedOn: "تاريخ النشر",
    public: "عام",
    authenticated: "مستخدمون مسجلون",
    resourceRestricted: "مقيّد",
    guide: "دليل",
    policy: "سياسة",
    form: "نموذج",
    template: "قالب",
    book: "كتاب",
    study: "دراسة",
    video: "فيديو",
    research_paper: "ورقة بحثية",
    parent: "التصنيف الأب",
    nameEn: "الاسم بالإنجليزية",
    nameAr: "الاسم بالعربية",
    sortOrder: "ترتيب العرض",
    active: "نشط",
    mediaId: "معرّف ملف الوسائط",
    externalUrl: "أو رابط خارجي",
    changeNotes: "ملاحظات الإصدار",
    addVersion: "إضافة إصدار",
    publishVersion: "نشر هذا الإصدار",
    current: "الإصدار المنشور",
    confirmArchive: "أرشفة المصدر؟",
    archiveHint: "لن يظهر المصدر في المكتبة العامة بعد الأرشفة.",
    confirmDelete: "حذف التصنيف؟",
    deleteHint: "لا يمكن حذف تصنيف يحتوي على مصادر أو تصنيفات فرعية.",
    delete: "حذف",
    previous: "السابق",
    next: "التالي",
  },
  en: {
    title: "Digital library",
    description:
      "Govern policies, guides, templates, research, and media with controlled versions and clear access levels.",
    resources: "Resources",
    categories: "Categories",
    newResource: "New resource",
    newCategory: "New category",
    search: "Search title, description, or keywords…",
    allStatuses: "All statuses",
    allTypes: "All types",
    allAccess: "All access levels",
    apply: "Apply",
    resource: "Resource",
    category: "Category",
    type: "Type",
    access: "Access",
    version: "Version",
    status: "Status",
    actions: "Actions",
    versions: "Manage versions",
    edit: "Edit",
    archive: "Archive",
    total: "Total resources",
    published: "Published",
    draft: "Draft",
    restricted: "Restricted access",
    empty: "No matching resources.",
    emptyCategories: "No categories have been created.",
    save: "Save",
    saving: "Saving…",
    close: "Close",
    required: "Complete all required fields.",
    success: "Library data saved.",
    archived: "Resource archived.",
    versionAdded: "Version added.",
    versionPublished: "Selected version published.",
    deleted: "Category deleted.",
    slug: "Slug",
    titleEn: "Title in English",
    titleAr: "Title in Arabic",
    titleNl: "Title in Dutch",
    descriptionEn: "Description in English",
    descriptionAr: "Description in Arabic",
    authors: "Authors (comma separated)",
    keywords: "Keywords (comma separated)",
    language: "Resource language",
    publisher: "Publisher",
    publishedOn: "Publication date",
    public: "Public",
    authenticated: "Authenticated users",
    resourceRestricted: "Restricted",
    guide: "Guide",
    policy: "Policy",
    form: "Form",
    template: "Template",
    book: "Book",
    study: "Study",
    video: "Video",
    research_paper: "Research paper",
    parent: "Parent category",
    nameEn: "Name in English",
    nameAr: "Name in Arabic",
    sortOrder: "Sort order",
    active: "Active",
    mediaId: "Media file ID",
    externalUrl: "Or external URL",
    changeNotes: "Version notes",
    addVersion: "Add version",
    publishVersion: "Publish this version",
    current: "Published version",
    confirmArchive: "Archive this resource?",
    archiveHint: "The resource will no longer appear in the public library.",
    confirmDelete: "Delete this category?",
    deleteHint: "Categories with resources or children cannot be deleted.",
    delete: "Delete",
    previous: "Previous",
    next: "Next",
  },
  nl: {
    title: "Digitale bibliotheek",
    description:
      "Beheer beleid, handleidingen, sjablonen en onderzoek met gecontroleerde versies en toegangsniveaus.",
    resources: "Bronnen",
    categories: "Categorieën",
    newResource: "Nieuwe bron",
    newCategory: "Nieuwe categorie",
    search: "Zoek titel, beschrijving of trefwoorden…",
    allStatuses: "Alle statussen",
    allTypes: "Alle typen",
    allAccess: "Alle toegangsniveaus",
    apply: "Toepassen",
    resource: "Bron",
    category: "Categorie",
    type: "Type",
    access: "Toegang",
    version: "Versie",
    status: "Status",
    actions: "Acties",
    versions: "Versies beheren",
    edit: "Bewerken",
    archive: "Archiveren",
    total: "Totaal bronnen",
    published: "Gepubliceerd",
    draft: "Concept",
    restricted: "Beperkte toegang",
    empty: "Geen bronnen gevonden.",
    emptyCategories: "Er zijn nog geen categorieën.",
    save: "Opslaan",
    saving: "Opslaan…",
    close: "Sluiten",
    required: "Vul alle verplichte velden in.",
    success: "Bibliotheekgegevens opgeslagen.",
    archived: "Bron gearchiveerd.",
    versionAdded: "Versie toegevoegd.",
    versionPublished: "Geselecteerde versie gepubliceerd.",
    deleted: "Categorie verwijderd.",
    slug: "Slug",
    titleEn: "Titel in het Engels",
    titleAr: "Titel in het Arabisch",
    titleNl: "Titel in het Nederlands",
    descriptionEn: "Beschrijving in het Engels",
    descriptionAr: "Beschrijving in het Arabisch",
    authors: "Auteurs (kommagescheiden)",
    keywords: "Trefwoorden (kommagescheiden)",
    language: "Brontaal",
    publisher: "Uitgever",
    publishedOn: "Publicatiedatum",
    public: "Openbaar",
    authenticated: "Ingelogde gebruikers",
    resourceRestricted: "Beperkt",
    guide: "Handleiding",
    policy: "Beleid",
    form: "Formulier",
    template: "Sjabloon",
    book: "Boek",
    study: "Studie",
    video: "Video",
    research_paper: "Onderzoeksartikel",
    parent: "Bovenliggende categorie",
    nameEn: "Naam in het Engels",
    nameAr: "Naam in het Arabisch",
    sortOrder: "Sorteervolgorde",
    active: "Actief",
    mediaId: "Media-bestands-ID",
    externalUrl: "Of externe URL",
    changeNotes: "Versienotities",
    addVersion: "Versie toevoegen",
    publishVersion: "Deze versie publiceren",
    current: "Gepubliceerde versie",
    confirmArchive: "Deze bron archiveren?",
    archiveHint:
      "De bron is daarna niet meer zichtbaar in de openbare bibliotheek.",
    confirmDelete: "Deze categorie verwijderen?",
    deleteHint:
      "Categorieën met bronnen of kinderen kunnen niet worden verwijderd.",
    delete: "Verwijderen",
    previous: "Vorige",
    next: "Volgende",
  },
};

Object.assign(copies.ar, {
  descriptionNl: "الوصف بالهولندية",
  nameNl: "الاسم بالهولندية",
  categoryDescriptionEn: "وصف التصنيف بالإنجليزية",
  categoryDescriptionAr: "وصف التصنيف بالعربية",
  categoryDescriptionNl: "وصف التصنيف بالهولندية",
});
Object.assign(copies.en, {
  descriptionNl: "Description in Dutch",
  nameNl: "Name in Dutch",
  categoryDescriptionEn: "Category description in English",
  categoryDescriptionAr: "Category description in Arabic",
  categoryDescriptionNl: "Category description in Dutch",
});
Object.assign(copies.nl, {
  descriptionNl: "Beschrijving in het Nederlands",
  nameNl: "Naam in het Nederlands",
  categoryDescriptionEn: "Categoriebeschrijving in het Engels",
  categoryDescriptionAr: "Categoriebeschrijving in het Arabisch",
  categoryDescriptionNl: "Categoriebeschrijving in het Nederlands",
});

const resourceTypes = [
  "guide",
  "policy",
  "form",
  "template",
  "book",
  "study",
  "video",
  "research_paper",
];
const emptyResource = {
  id: null,
  library_category_id: "",
  slug: "",
  type: "guide",
  title_en: "",
  title_ar: "",
  title_nl: "",
  description_en: "",
  description_ar: "",
  description_nl: "",
  authors: "",
  keywords: "",
  language: "en",
  publisher: "",
  published_on: "",
  access_level: "public",
};
const emptyCategory = {
  id: null,
  parent_id: "",
  slug: "",
  name_en: "",
  name_ar: "",
  name_nl: "",
  description_en: "",
  description_ar: "",
  description_nl: "",
  sort_order: 0,
  is_active: true,
};
const emptyVersion = { media_id: "", external_url: "", change_notes: "" };

function mapResource(resource = {}) {
  return {
    id: resource.id || null,
    library_category_id: resource.library_category_id || "",
    slug: resource.slug || "",
    type: resource.type || "guide",
    title_en: resource.title?.en || "",
    title_ar: resource.title?.ar || "",
    title_nl: resource.title?.nl || "",
    description_en: resource.description?.en || "",
    description_ar: resource.description?.ar || "",
    description_nl: resource.description?.nl || "",
    authors: Array.isArray(resource.authors) ? resource.authors.join(", ") : "",
    keywords: Array.isArray(resource.keywords)
      ? resource.keywords.join(", ")
      : "",
    language: resource.language || "en",
    publisher: resource.publisher || "",
    published_on: resource.published_on?.slice?.(0, 10) || "",
    access_level: resource.access_level || "public",
  };
}

function mapCategory(category = {}) {
  return {
    id: category.id || null,
    parent_id: category.parent_id || "",
    slug: category.slug || "",
    name_en: category.name?.en || "",
    name_ar: category.name?.ar || "",
    name_nl: category.name?.nl || "",
    description_en: category.description?.en || "",
    description_ar: category.description?.ar || "",
    description_nl: category.description?.nl || "",
    sort_order: category.sort_order || 0,
    is_active: category.is_active !== false,
  };
}

export default function DigitalLibraryPage() {
  const language = getAdminLanguage();
  const isArabic = language === "ar";
  const copy = copies[language] || copies.en;
  const [tab, setTab] = useState("resources");
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    type: "",
    access_level: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState(null);
  const [resourceForm, setResourceForm] = useState(emptyResource);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [versionForm, setVersionForm] = useState(emptyVersion);
  const [selected, setSelected] = useState(null);

  const loadData = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError("");
      try {
        const [resourcePayload, categoryPayload] = await Promise.all([
          fetchLibraryResources({ ...appliedFilters, page, per_page: 20 }),
          fetchLibraryCategories(),
        ]);
        setResources(unwrapCollection(resourcePayload));
        setPagination(readPagination(resourcePayload));
        setCategories(unwrapCollection(categoryPayload));
      } catch (requestError) {
        setError(readApiError(requestError));
      } finally {
        setIsLoading(false);
      }
    },
    [appliedFilters],
  );
  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const metrics = useMemo(
    () => ({
      total: pagination?.total ?? resources.length,
      published: resources.filter((item) => item.status === "published").length,
      draft: resources.filter((item) => item.status === "draft").length,
      restricted: resources.filter((item) => item.access_level === "restricted")
        .length,
    }),
    [pagination, resources],
  );

  async function saveResource(event) {
    event.preventDefault();
    if (!resourceForm.slug || !resourceForm.title_en) {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    setError("");
    const payload = {
      library_category_id: resourceForm.library_category_id
        ? Number(resourceForm.library_category_id)
        : null,
      slug: resourceForm.slug,
      type: resourceForm.type,
      title: {
        en: resourceForm.title_en,
        ar: resourceForm.title_ar,
        nl: resourceForm.title_nl,
      },
      description: {
        en: resourceForm.description_en,
        ar: resourceForm.description_ar,
        nl: resourceForm.description_nl,
      },
      authors: resourceForm.authors
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      keywords: resourceForm.keywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      language: resourceForm.language || null,
      publisher: resourceForm.publisher || null,
      published_on: resourceForm.published_on || null,
      access_level: resourceForm.access_level,
    };
    try {
      if (resourceForm.id)
        await updateLibraryResource(resourceForm.id, payload);
      else await createLibraryResource(payload);
      setModal(null);
      setSuccess(copy.success);
      await loadData(pagination?.currentPage || 1);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (!categoryForm.slug || !categoryForm.name_en) {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    setError("");
    const payload = {
      parent_id: categoryForm.parent_id ? Number(categoryForm.parent_id) : null,
      slug: categoryForm.slug,
      name: {
        en: categoryForm.name_en,
        ar: categoryForm.name_ar,
        nl: categoryForm.name_nl,
      },
      description: {
        en: categoryForm.description_en,
        ar: categoryForm.description_ar,
        nl: categoryForm.description_nl,
      },
      sort_order: Number(categoryForm.sort_order),
      is_active: categoryForm.is_active,
    };
    try {
      if (categoryForm.id)
        await updateLibraryCategory(categoryForm.id, payload);
      else await createLibraryCategory(payload);
      setModal(null);
      setSuccess(copy.success);
      await loadData(pagination?.currentPage || 1);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openVersions(resource) {
    setModal("versions");
    setSelected(resource);
    setVersionForm(emptyVersion);
    setError("");
    try {
      const payload = await fetchLibraryResource(resource.id);
      setSelected(unwrapApiData(payload));
    } catch (requestError) {
      setError(readApiError(requestError));
    }
  }

  async function addVersion(event) {
    event.preventDefault();
    if (!versionForm.media_id && !versionForm.external_url) {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const payload = {};
      if (versionForm.media_id) payload.media_id = Number(versionForm.media_id);
      if (versionForm.external_url)
        payload.external_url = versionForm.external_url;
      if (versionForm.change_notes)
        payload.change_notes = [versionForm.change_notes];
      await addLibraryVersion(selected.id, payload);
      const updated = await fetchLibraryResource(selected.id);
      setSelected(unwrapApiData(updated));
      setVersionForm(emptyVersion);
      setSuccess(copy.versionAdded);
      await loadData(pagination?.currentPage || 1);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function publishVersion(version) {
    setIsSubmitting(true);
    setError("");
    try {
      await publishLibraryVersion(selected.id, version.id);
      const updated = await fetchLibraryResource(selected.id);
      setSelected(unwrapApiData(updated));
      setSuccess(copy.versionPublished);
      await loadData(pagination?.currentPage || 1);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmAction() {
    setIsSubmitting(true);
    setError("");
    try {
      if (modal === "archive") {
        await archiveLibraryResource(selected.id);
        setSuccess(copy.archived);
      } else {
        await deleteLibraryCategory(selected.id);
        setSuccess(copy.deleted);
      }
      setModal(null);
      setSelected(null);
      await loadData(pagination?.currentPage || 1);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns = [
    {
      key: "resource",
      label: copy.resource,
      render: (row) => (
        <div>
          <p className="font-bold text-[var(--color-primary)]">
            {readLocalized(row.title, language)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {row.slug}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      label: copy.category,
      render: (row) => readLocalized(row.category?.name, language) || "—",
    },
    {
      key: "type",
      label: copy.type,
      render: (row) => (
        <Badge variant="info">{copy[row.type] || row.type}</Badge>
      ),
    },
    {
      key: "access",
      label: copy.access,
      render: (row) =>
        copy[
          row.access_level === "restricted"
            ? "resourceRestricted"
            : row.access_level
        ] || row.access_level,
    },
    {
      key: "version",
      label: copy.version,
      render: (row) =>
        row.current_version_number ? `v${row.current_version_number}` : "—",
    },
    {
      key: "status",
      label: copy.status,
      render: (row) => (
        <StatusBadge
          value={row.status}
          labels={{
            published: copy.published,
            draft: copy.draft,
            archived: copy.archive,
          }}
        />
      ),
    },
    {
      key: "actions",
      label: copy.actions,
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => openVersions(row)}>
            <UploadCloud size={15} />
            {copy.versions}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setResourceForm(mapResource(row));
              setModal("resource");
            }}
          >
            {copy.edit}
          </Button>
          {row.status !== "archived" ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setSelected(row);
                setModal("archive");
              }}
            >
              <Archive size={15} />
              {copy.archive}
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
          <Button
            onClick={() => {
              if (tab === "resources") {
                setResourceForm(emptyResource);
                setModal("resource");
              } else {
                setCategoryForm(emptyCategory);
                setModal("category");
              }
            }}
          >
            <Plus size={18} />
            {tab === "resources" ? copy.newResource : copy.newCategory}
          </Button>
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
            value: "resources",
            label: copy.resources,
            icon: LibraryBig,
            count: pagination?.total,
          },
          {
            value: "categories",
            label: copy.categories,
            icon: FolderTree,
            count: categories.length,
          },
        ]}
      />
      {isLoading ? (
        <OperationsLoader />
      ) : tab === "resources" ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={LibraryBig}
              label={copy.total}
              value={metrics.total}
            />
            <MetricTile
              icon={Globe2}
              label={copy.published}
              value={metrics.published}
              variant="success"
            />
            <MetricTile
              icon={FilePlus2}
              label={copy.draft}
              value={metrics.draft}
            />
            <MetricTile
              icon={Boxes}
              label={copy.restricted}
              value={metrics.restricted}
              variant="warning"
            />
          </div>
          <Card>
            <CardContent className="pt-6">
              <form
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAppliedFilters(filters);
                }}
              >
                <Input
                  placeholder={copy.search}
                  leftIcon={<Search size={17} />}
                  value={filters.q}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      q: event.target.value,
                    }))
                  }
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
                  <option value="draft">{copy.draft}</option>
                  <option value="published">{copy.published}</option>
                  <option value="archived">{copy.archive}</option>
                </Select>
                <Select
                  value={filters.type}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="">{copy.allTypes}</option>
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {copy[type]}
                    </option>
                  ))}
                </Select>
                <Select
                  value={filters.access_level}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      access_level: event.target.value,
                    }))
                  }
                >
                  <option value="">{copy.allAccess}</option>
                  <option value="public">{copy.public}</option>
                  <option value="authenticated">{copy.authenticated}</option>
                  <option value="restricted">{copy.resourceRestricted}</option>
                </Select>
                <Button type="submit">{copy.apply}</Button>
              </form>
            </CardContent>
          </Card>
          {resources.length ? (
            <>
              <DataTableShell
                title={copy.resources}
                columns={columns}
                rows={resources}
              />
              <PaginationControls
                pagination={pagination}
                onPageChange={loadData}
                previousLabel={copy.previous}
                nextLabel={copy.next}
              />
            </>
          ) : (
            <Card>
              <EmptyState
                icon={BookOpen}
                title={copy.empty}
                action={
                  <Button
                    onClick={() => {
                      setResourceForm(emptyResource);
                      setModal("resource");
                    }}
                  >
                    {copy.newResource}
                  </Button>
                }
              />
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="rounded-2xl border border-[var(--color-border)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[var(--color-primary)]">
                        {readLocalized(category.name, language)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {category.slug} · {category.resources_count || 0}{" "}
                        {copy.resources}
                      </p>
                    </div>
                    <StatusBadge
                      value={category.is_active ? "active" : "archived"}
                      labels={{ active: copy.active, archived: copy.archive }}
                    />
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCategoryForm(mapCategory(category));
                        setModal("category");
                      }}
                    >
                      {copy.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setSelected(category);
                        setModal("delete-category");
                      }}
                    >
                      {copy.delete}
                    </Button>
                  </div>
                </article>
              ))}
              {categories.length === 0 ? (
                <EmptyState icon={FolderTree} title={copy.emptyCategories} />
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      <OperationsModal
        open={modal === "resource"}
        title={resourceForm.id ? copy.edit : copy.newResource}
        size="xl"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {copy.close}
            </Button>
            <Button
              type="submit"
              form="library-resource-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? copy.saving : copy.save}
            </Button>
          </>
        }
      >
        <form
          id="library-resource-form"
          className="grid gap-5 md:grid-cols-2"
          onSubmit={saveResource}
        >
          <Input
            label={copy.slug}
            required
            value={resourceForm.slug}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                slug: event.target.value,
              }))
            }
          />
          <Select
            label={copy.category}
            value={resourceForm.library_category_id}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                library_category_id: event.target.value,
              }))
            }
          >
            <option value="">—</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {readLocalized(category.name, language)}
              </option>
            ))}
          </Select>
          <Select
            label={copy.type}
            value={resourceForm.type}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                type: event.target.value,
              }))
            }
          >
            {resourceTypes.map((type) => (
              <option key={type} value={type}>
                {copy[type]}
              </option>
            ))}
          </Select>
          <Select
            label={copy.access}
            value={resourceForm.access_level}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                access_level: event.target.value,
              }))
            }
          >
            <option value="public">{copy.public}</option>
            <option value="authenticated">{copy.authenticated}</option>
            <option value="restricted">{copy.resourceRestricted}</option>
          </Select>
          <Input
            label={copy.titleEn}
            required
            value={resourceForm.title_en}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                title_en: event.target.value,
              }))
            }
          />
          <Input
            label={copy.titleAr}
            dir="rtl"
            value={resourceForm.title_ar}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                title_ar: event.target.value,
              }))
            }
          />
          <Input
            label={copy.titleNl}
            value={resourceForm.title_nl}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                title_nl: event.target.value,
              }))
            }
          />
          <Input
            label={copy.language}
            value={resourceForm.language}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                language: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.descriptionEn}
            value={resourceForm.description_en}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                description_en: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.descriptionAr}
            dir="rtl"
            value={resourceForm.description_ar}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                description_ar: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.descriptionNl}
            value={resourceForm.description_nl}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                description_nl: event.target.value,
              }))
            }
          />
          <Input
            label={copy.authors}
            value={resourceForm.authors}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                authors: event.target.value,
              }))
            }
          />
          <Input
            label={copy.keywords}
            value={resourceForm.keywords}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                keywords: event.target.value,
              }))
            }
          />
          <Input
            label={copy.publisher}
            value={resourceForm.publisher}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                publisher: event.target.value,
              }))
            }
          />
          <Input
            label={copy.publishedOn}
            type="date"
            value={resourceForm.published_on}
            onChange={(event) =>
              setResourceForm((current) => ({
                ...current,
                published_on: event.target.value,
              }))
            }
          />
        </form>
      </OperationsModal>

      <OperationsModal
        open={modal === "category"}
        title={categoryForm.id ? copy.edit : copy.newCategory}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {copy.close}
            </Button>
            <Button
              type="submit"
              form="library-category-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? copy.saving : copy.save}
            </Button>
          </>
        }
      >
        <form
          id="library-category-form"
          className="grid gap-5 md:grid-cols-2"
          onSubmit={saveCategory}
        >
          <Input
            label={copy.slug}
            required
            value={categoryForm.slug}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                slug: event.target.value,
              }))
            }
          />
          <Select
            label={copy.parent}
            value={categoryForm.parent_id}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                parent_id: event.target.value,
              }))
            }
          >
            <option value="">—</option>
            {categories
              .filter((category) => category.id !== categoryForm.id)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {readLocalized(category.name, language)}
                </option>
              ))}
          </Select>
          <Input
            label={copy.nameEn}
            required
            value={categoryForm.name_en}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                name_en: event.target.value,
              }))
            }
          />
          <Input
            label={copy.nameAr}
            dir="rtl"
            value={categoryForm.name_ar}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                name_ar: event.target.value,
              }))
            }
          />
          <Input
            label={copy.nameNl}
            value={categoryForm.name_nl}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                name_nl: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.categoryDescriptionEn}
            value={categoryForm.description_en}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                description_en: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.categoryDescriptionAr}
            dir="rtl"
            value={categoryForm.description_ar}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                description_ar: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.categoryDescriptionNl}
            value={categoryForm.description_nl}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                description_nl: event.target.value,
              }))
            }
          />
          <Input
            label={copy.sortOrder}
            type="number"
            min="0"
            value={categoryForm.sort_order}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                sort_order: event.target.value,
              }))
            }
          />
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={categoryForm.is_active}
              onChange={(event) =>
                setCategoryForm((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
            />
            {copy.active}
          </label>
        </form>
      </OperationsModal>

      <OperationsModal
        open={modal === "versions"}
        title={`${copy.versions}: ${readLocalized(selected?.title, language) || ""}`}
        size="xl"
        onClose={() => setModal(null)}
      >
        <form
          className="grid gap-4 rounded-2xl bg-[var(--color-surface-muted)] p-5 md:grid-cols-2"
          onSubmit={addVersion}
        >
          <Input
            label={copy.mediaId}
            type="number"
            min="1"
            value={versionForm.media_id}
            onChange={(event) =>
              setVersionForm((current) => ({
                ...current,
                media_id: event.target.value,
                external_url: event.target.value ? "" : current.external_url,
              }))
            }
          />
          <Input
            label={copy.externalUrl}
            type="url"
            value={versionForm.external_url}
            onChange={(event) =>
              setVersionForm((current) => ({
                ...current,
                external_url: event.target.value,
                media_id: event.target.value ? "" : current.media_id,
              }))
            }
          />
          <Textarea
            className="md:col-span-2"
            label={copy.changeNotes}
            value={versionForm.change_notes}
            onChange={(event) =>
              setVersionForm((current) => ({
                ...current,
                change_notes: event.target.value,
              }))
            }
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              <Plus size={16} />
              {copy.addVersion}
            </Button>
          </div>
        </form>
        <div className="mt-6 space-y-3">
          {selected?.versions?.map((version) => (
            <div
              key={version.id}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold">
                  v{version.version_number}{" "}
                  {Number(selected.current_version_number) ===
                  Number(version.version_number) ? (
                    <Badge variant="success" className="ms-2">
                      {copy.current}
                    </Badge>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {version.media?.original_name || version.external_url || "—"}
                </p>
              </div>
              {Number(selected.current_version_number) !==
              Number(version.version_number) ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => publishVersion(version)}
                >
                  {copy.publishVersion}
                </Button>
              ) : null}
            </div>
          ))}
          {selected && !selected.versions?.length ? (
            <EmptyState icon={UploadCloud} title={copy.empty} />
          ) : null}
        </div>
      </OperationsModal>

      <OperationsModal
        open={modal === "archive" || modal === "delete-category"}
        title={modal === "archive" ? copy.confirmArchive : copy.confirmDelete}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {copy.close}
            </Button>
            <Button
              variant="danger"
              disabled={isSubmitting}
              onClick={confirmAction}
            >
              {isSubmitting
                ? copy.saving
                : modal === "archive"
                  ? copy.archive
                  : copy.delete}
            </Button>
          </>
        }
      >
        <p className="leading-7 text-[var(--color-text-muted)]">
          {modal === "archive" ? copy.archiveHint : copy.deleteHint}
        </p>
      </OperationsModal>
    </section>
  );
}
