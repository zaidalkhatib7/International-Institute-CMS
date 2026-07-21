import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgePercent,
  CalendarClock,
  ChartNoAxesCombined,
  CircleDollarSign,
  CreditCard,
  PackageOpen,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTableShell,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "../../../components/ui";
import {
  readApiError,
  readLocalized,
  unwrapApiData,
  unwrapCollection,
} from "../../../services/apiResponse";
import { getAdminLanguage } from "../../../services/languageStorage";
import {
  formatLocalizedDateTime,
  formatLocalizedNumber,
} from "../../../utils/localization";
import {
  EmptyState,
  MetricTile,
  OperationAlert,
  OperationsLoader,
  OperationsModal,
  OperationsTabs,
  StatusBadge,
} from "../../operations/components/OperationsUI";
import {
  createFinanceCoupon,
  createFinancePrice,
  createFinanceProduct,
  fetchFinanceCoupons,
  fetchFinanceDashboard,
  fetchFinanceProducts,
  fetchFinanceSubscriptions,
  updateFinanceCoupon,
  updateFinancePrice,
  updateFinanceProduct,
  updateFinanceSubscription,
} from "../services/financeService";

const copies = {
  ar: {
    title: "العمليات المالية",
    description:
      "إدارة المنتجات والأسعار والخصومات والاشتراكات مع تقارير مالية متعددة العملات وعمليات دفع آمنة.",
    overview: "نظرة مالية",
    products: "المنتجات والأسعار",
    coupons: "الخصومات",
    subscriptions: "الاشتراكات",
    newProduct: "منتج جديد",
    newCoupon: "قسيمة جديدة",
    periodFrom: "من تاريخ",
    periodUntil: "إلى تاريخ",
    refresh: "تحديث التقرير",
    paidOrders: "الطلبات المدفوعة",
    activeSubscriptions: "اشتراكات فعالة",
    renewals: "تجديدات خلال 30 يوماً",
    paymentFailures: "دفعات غير ناجحة",
    gross: "الإجمالي حسب العملة",
    refunds: "المبالغ المستردة",
    discounts: "الخصومات",
    noData: "لا توجد بيانات مالية للفترة المحددة.",
    product: "المنتج",
    code: "الرمز",
    type: "النوع",
    prices: "الأسعار",
    status: "الحالة",
    actions: "الإجراءات",
    edit: "تعديل",
    managePrices: "إدارة الأسعار",
    search: "ابحث في المنتجات…",
    allTypes: "كل الأنواع",
    nameEn: "الاسم بالإنجليزية",
    nameAr: "الاسم بالعربية",
    descriptionEn: "الوصف بالإنجليزية",
    active: "نشط",
    archived: "مؤرشف",
    save: "حفظ",
    saving: "جارٍ الحفظ…",
    close: "إغلاق",
    required: "أكمل الحقول المطلوبة.",
    success: "تم تحديث البيانات المالية.",
    addPrice: "إضافة سعر",
    currency: "العملة",
    amount: "المبلغ",
    billingInterval: "دورة الفوترة",
    oneTime: "مرة واحدة",
    monthly: "شهري",
    quarterly: "ربع سنوي",
    yearly: "سنوي",
    validFrom: "صالح من",
    validUntil: "صالح حتى",
    coupon: "القسيمة",
    discountType: "نوع الخصم",
    percent: "نسبة مئوية",
    fixed: "مبلغ ثابت",
    value: "القيمة",
    minimumOrder: "الحد الأدنى للطلب",
    maximumDiscount: "أقصى خصم",
    redemptionLimit: "إجمالي مرات الاستخدام",
    perUserLimit: "الحد لكل مستخدم",
    startsAt: "يبدأ في",
    endsAt: "ينتهي في",
    redemptions: "الاستخدامات",
    user: "المستخدم",
    renewal: "التجديد",
    updateStatus: "تحديث الحالة",
    pending: "معلّق",
    past_due: "متأخر الدفع",
    paused: "متوقف مؤقتاً",
    cancelled: "ملغى",
    expired: "منتهي",
    program: "برنامج",
    rpl_fee: "رسوم RPL",
    subscription: "اشتراك",
    assessment: "تقييم",
    certificate: "شهادة",
    other: "أخرى",
  },
  en: {
    title: "Finance operations",
    description:
      "Manage products, pricing, discounts, and subscriptions with multi-currency reporting and safe payment workflows.",
    overview: "Finance overview",
    products: "Products & prices",
    coupons: "Coupons",
    subscriptions: "Subscriptions",
    newProduct: "New product",
    newCoupon: "New coupon",
    periodFrom: "From date",
    periodUntil: "Until date",
    refresh: "Refresh report",
    paidOrders: "Paid orders",
    activeSubscriptions: "Active subscriptions",
    renewals: "Renewals within 30 days",
    paymentFailures: "Unsuccessful payments",
    gross: "Gross by currency",
    refunds: "Refunds",
    discounts: "Discounts",
    noData: "No financial data exists for the selected period.",
    product: "Product",
    code: "Code",
    type: "Type",
    prices: "Prices",
    status: "Status",
    actions: "Actions",
    edit: "Edit",
    managePrices: "Manage prices",
    search: "Search products…",
    allTypes: "All types",
    nameEn: "Name in English",
    nameAr: "Name in Arabic",
    descriptionEn: "Description in English",
    active: "Active",
    archived: "Archived",
    save: "Save",
    saving: "Saving…",
    close: "Close",
    required: "Complete all required fields.",
    success: "Finance data updated.",
    addPrice: "Add price",
    currency: "Currency",
    amount: "Amount",
    billingInterval: "Billing interval",
    oneTime: "One time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
    validFrom: "Valid from",
    validUntil: "Valid until",
    coupon: "Coupon",
    discountType: "Discount type",
    percent: "Percentage",
    fixed: "Fixed amount",
    value: "Value",
    minimumOrder: "Minimum order",
    maximumDiscount: "Maximum discount",
    redemptionLimit: "Total redemption limit",
    perUserLimit: "Per-user limit",
    startsAt: "Starts at",
    endsAt: "Ends at",
    redemptions: "Redemptions",
    user: "User",
    renewal: "Renewal",
    updateStatus: "Update status",
    pending: "Pending",
    past_due: "Past due",
    paused: "Paused",
    cancelled: "Cancelled",
    expired: "Expired",
    program: "Program",
    rpl_fee: "RPL fee",
    subscription: "Subscription",
    assessment: "Assessment",
    certificate: "Certificate",
    other: "Other",
  },
  nl: {
    title: "Financiële operaties",
    description:
      "Beheer producten, prijzen, kortingen en abonnementen met rapportage per valuta en veilige betaalprocessen.",
    overview: "Financieel overzicht",
    products: "Producten en prijzen",
    coupons: "Kortingscodes",
    subscriptions: "Abonnementen",
    newProduct: "Nieuw product",
    newCoupon: "Nieuwe kortingscode",
    periodFrom: "Vanaf datum",
    periodUntil: "Tot datum",
    refresh: "Rapport vernieuwen",
    paidOrders: "Betaalde orders",
    activeSubscriptions: "Actieve abonnementen",
    renewals: "Verlengingen binnen 30 dagen",
    paymentFailures: "Mislukte betalingen",
    gross: "Bruto per valuta",
    refunds: "Terugbetalingen",
    discounts: "Kortingen",
    noData: "Geen financiële gegevens voor de geselecteerde periode.",
    product: "Product",
    code: "Code",
    type: "Type",
    prices: "Prijzen",
    status: "Status",
    actions: "Acties",
    edit: "Bewerken",
    managePrices: "Prijzen beheren",
    search: "Zoek producten…",
    allTypes: "Alle typen",
    nameEn: "Naam in het Engels",
    nameAr: "Naam in het Arabisch",
    descriptionEn: "Beschrijving in het Engels",
    active: "Actief",
    archived: "Gearchiveerd",
    save: "Opslaan",
    saving: "Opslaan…",
    close: "Sluiten",
    required: "Vul alle verplichte velden in.",
    success: "Financiële gegevens bijgewerkt.",
    addPrice: "Prijs toevoegen",
    currency: "Valuta",
    amount: "Bedrag",
    billingInterval: "Factureringsinterval",
    oneTime: "Eenmalig",
    monthly: "Maandelijks",
    quarterly: "Per kwartaal",
    yearly: "Jaarlijks",
    validFrom: "Geldig vanaf",
    validUntil: "Geldig tot",
    coupon: "Kortingscode",
    discountType: "Kortingstype",
    percent: "Percentage",
    fixed: "Vast bedrag",
    value: "Waarde",
    minimumOrder: "Minimumorder",
    maximumDiscount: "Maximale korting",
    redemptionLimit: "Totale gebruikslimiet",
    perUserLimit: "Limiet per gebruiker",
    startsAt: "Start op",
    endsAt: "Eindigt op",
    redemptions: "Gebruik",
    user: "Gebruiker",
    renewal: "Verlenging",
    updateStatus: "Status bijwerken",
    pending: "In afwachting",
    past_due: "Achterstallig",
    paused: "Gepauzeerd",
    cancelled: "Geannuleerd",
    expired: "Verlopen",
    program: "Programma",
    rpl_fee: "RPL-kosten",
    subscription: "Abonnement",
    assessment: "Beoordeling",
    certificate: "Certificaat",
    other: "Overig",
  },
};

Object.assign(copies.ar, {
  nameNl: "الاسم بالهولندية",
  descriptionAr: "الوصف بالعربية",
  descriptionNl: "الوصف بالهولندية",
});
Object.assign(copies.en, {
  nameNl: "Name in Dutch",
  descriptionAr: "Description in Arabic",
  descriptionNl: "Description in Dutch",
});
Object.assign(copies.nl, {
  nameNl: "Naam in het Nederlands",
  descriptionAr: "Beschrijving in het Arabisch",
  descriptionNl: "Beschrijving in het Nederlands",
});

const productTypes = [
  "program",
  "rpl_fee",
  "subscription",
  "assessment",
  "certificate",
  "other",
];
const emptyProduct = {
  id: null,
  code: "",
  type: "other",
  name_en: "",
  name_ar: "",
  name_nl: "",
  description_en: "",
  description_ar: "",
  description_nl: "",
  is_active: true,
};
const emptyPrice = {
  id: null,
  currency: "EUR",
  amount: "",
  billing_interval: "one_time",
  is_active: true,
  valid_from: "",
  valid_until: "",
};
const emptyCoupon = {
  id: null,
  code: "",
  discount_type: "percent",
  value: "",
  currency: "",
  minimum_order: 0,
  maximum_discount: "",
  redemption_limit: "",
  per_user_limit: "",
  is_active: true,
  starts_at: "",
  ends_at: "",
};

function dateOnly(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}
function mapProduct(item = {}) {
  return {
    id: item.id || null,
    code: item.code || "",
    type: item.type || "other",
    name_en: item.name?.en || "",
    name_ar: item.name?.ar || "",
    name_nl: item.name?.nl || "",
    description_en: item.description?.en || "",
    description_ar: item.description?.ar || "",
    description_nl: item.description?.nl || "",
    is_active: item.is_active !== false,
  };
}
function mapPrice(item = {}) {
  return {
    id: item.id || null,
    currency: item.currency || "EUR",
    amount: item.amount || "",
    billing_interval: item.billing_interval || "one_time",
    is_active: item.is_active !== false,
    valid_from: dateOnly(item.valid_from),
    valid_until: dateOnly(item.valid_until),
  };
}
function mapCoupon(item = {}) {
  return {
    id: item.id || null,
    code: item.code || "",
    discount_type: item.discount_type || "percent",
    value: item.value || "",
    currency: item.currency || "",
    minimum_order: item.minimum_order || 0,
    maximum_discount: item.maximum_discount || "",
    redemption_limit: item.redemption_limit || "",
    per_user_limit: item.per_user_limit || "",
    is_active: item.is_active !== false,
    starts_at: dateOnly(item.starts_at),
    ends_at: dateOnly(item.ends_at),
  };
}
function sumObjectValues(value) {
  return Object.values(value || {}).reduce(
    (sum, item) => sum + Number(item || 0),
    0,
  );
}

export default function FinanceOperationsPage() {
  const language = getAdminLanguage();
  const isArabic = language === "ar";
  const copy = copies[language] || copies.en;
  const [tab, setTab] = useState("overview");
  const [dashboard, setDashboard] = useState({});
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [reportFilters, setReportFilters] = useState({ from: "", until: "" });
  const [appliedReportFilters, setAppliedReportFilters] =
    useState(reportFilters);
  const [productFilters, setProductFilters] = useState({ q: "", type: "" });
  const [appliedProductFilters, setAppliedProductFilters] =
    useState(productFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [priceForm, setPriceForm] = useState(emptyPrice);
  const [couponForm, setCouponForm] = useState(emptyCoupon);
  const [subscriptionForm, setSubscriptionForm] = useState({
    status: "active",
    renews_at: "",
    ends_at: "",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [
        dashboardPayload,
        productsPayload,
        couponsPayload,
        subscriptionsPayload,
      ] = await Promise.all([
        fetchFinanceDashboard(appliedReportFilters),
        fetchFinanceProducts({ ...appliedProductFilters, per_page: 100 }),
        fetchFinanceCoupons({ per_page: 100 }),
        fetchFinanceSubscriptions({ per_page: 100 }),
      ]);
      setDashboard(unwrapApiData(dashboardPayload) || {});
      setProducts(unwrapCollection(productsPayload));
      setCoupons(unwrapCollection(couponsPayload));
      setSubscriptions(unwrapCollection(subscriptionsPayload));
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [appliedProductFilters, appliedReportFilters]);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const paidOrders = Number(dashboard.orders_by_status?.paid || 0);
  const failedPayments =
    sumObjectValues(dashboard.payments_by_status) -
    Number(dashboard.payments_by_status?.paid || 0);
  const visibleProducts = useMemo(() => {
    const query = appliedProductFilters.q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [
        product.code,
        readLocalized(product.name, "en"),
        readLocalized(product.name, "ar"),
        readLocalized(product.name, "nl"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [appliedProductFilters.q, products]);
  async function saveProduct(event) {
    event.preventDefault();
    if (!productForm.code || !productForm.name_en) {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        code: productForm.code,
        type: productForm.type,
        name: {
          en: productForm.name_en,
          ar: productForm.name_ar,
          nl: productForm.name_nl,
        },
        description: {
          en: productForm.description_en,
          ar: productForm.description_ar,
          nl: productForm.description_nl,
        },
        is_active: productForm.is_active,
      };
      if (productForm.id) await updateFinanceProduct(productForm.id, payload);
      else await createFinanceProduct(payload);
      setModal(null);
      setSuccess(copy.success);
      await loadData();
    } catch (requestError) {
      setError(readApiError(requestError, undefined, language));
    } finally {
      setIsSubmitting(false);
    }
  }
  async function savePrice(event) {
    event.preventDefault();
    if (!priceForm.currency || priceForm.amount === "") {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        currency: priceForm.currency.toUpperCase(),
        amount: Number(priceForm.amount),
        billing_interval: priceForm.billing_interval,
        is_active: priceForm.is_active,
        valid_from: priceForm.valid_from || null,
        valid_until: priceForm.valid_until || null,
      };
      if (priceForm.id)
        await updateFinancePrice(selected.id, priceForm.id, payload);
      else await createFinancePrice(selected.id, payload);
      const productsPayload = await fetchFinanceProducts({
        ...appliedProductFilters,
        per_page: 100,
      });
      const refreshedProducts = unwrapCollection(productsPayload);
      setProducts(refreshedProducts);
      setSelected(
        refreshedProducts.find((item) => item.id === selected.id) || selected,
      );
      setPriceForm(emptyPrice);
      setSuccess(copy.success);
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }
  async function saveCoupon(event) {
    event.preventDefault();
    if (!couponForm.code || couponForm.value === "") {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        code: couponForm.code,
        discount_type: couponForm.discount_type,
        value: Number(couponForm.value),
        currency:
          couponForm.discount_type === "fixed"
            ? couponForm.currency.toUpperCase()
            : null,
        minimum_order: Number(couponForm.minimum_order || 0),
        maximum_discount: couponForm.maximum_discount
          ? Number(couponForm.maximum_discount)
          : null,
        redemption_limit: couponForm.redemption_limit
          ? Number(couponForm.redemption_limit)
          : null,
        per_user_limit: couponForm.per_user_limit
          ? Number(couponForm.per_user_limit)
          : null,
        is_active: couponForm.is_active,
        starts_at: couponForm.starts_at || null,
        ends_at: couponForm.ends_at || null,
      };
      if (couponForm.id) await updateFinanceCoupon(couponForm.id, payload);
      else await createFinanceCoupon(payload);
      setModal(null);
      setSuccess(copy.success);
      await loadData();
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }
  async function saveSubscription(event) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await updateFinanceSubscription(selected.id, {
        status: subscriptionForm.status,
        renews_at: subscriptionForm.renews_at || null,
        ends_at: subscriptionForm.ends_at || null,
      });
      setModal(null);
      setSuccess(copy.success);
      await loadData();
    } catch (requestError) {
      setError(readApiError(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const productColumns = [
    {
      key: "product",
      label: copy.product,
      render: (row) => (
        <div>
          <p className="font-bold text-[var(--color-primary)]">
            {readLocalized(row.name, language)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {row.code}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      label: copy.type,
      render: (row) => (
        <Badge variant="info">{copy[row.type] || row.type}</Badge>
      ),
    },
    {
      key: "prices",
      label: copy.prices,
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.prices?.map((price) => (
            <Badge
              key={price.id}
              variant={price.is_active ? "success" : "neutral"}
            >
              {price.currency} {price.amount}
            </Badge>
          ))}
          {!row.prices?.length ? "—" : null}
        </div>
      ),
    },
    {
      key: "status",
      label: copy.status,
      render: (row) => (
        <StatusBadge
          value={row.is_active ? "active" : "archived"}
          labels={{ active: copy.active, archived: copy.archived }}
        />
      ),
    },
    {
      key: "actions",
      label: copy.actions,
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setProductForm(mapProduct(row));
              setModal("product");
            }}
          >
            {copy.edit}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelected(row);
              setPriceForm(emptyPrice);
              setModal("prices");
            }}
          >
            <CreditCard size={15} />
            {copy.managePrices}
          </Button>
        </div>
      ),
    },
  ];
  const couponColumns = [
    {
      key: "coupon",
      label: copy.coupon,
      render: (row) => (
        <div>
          <p className="font-bold text-[var(--color-primary)]">{row.code}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {row.discount_type === "percent"
              ? `${row.value}%`
              : `${row.currency} ${row.value}`}
          </p>
        </div>
      ),
    },
    {
      key: "minimum",
      label: copy.minimumOrder,
      render: (row) => row.minimum_order,
    },
    {
      key: "redemptions",
      label: copy.redemptions,
      render: (row) =>
        `${row.redemptions_count || 0}${row.redemption_limit ? ` / ${row.redemption_limit}` : ""}`,
    },
    {
      key: "window",
      label: copy.validUntil,
      render: (row) =>
        row.ends_at ? formatLocalizedDateTime(row.ends_at, language) : "—",
    },
    {
      key: "status",
      label: copy.status,
      render: (row) => (
        <StatusBadge
          value={row.is_active ? "active" : "archived"}
          labels={{ active: copy.active, archived: copy.archived }}
        />
      ),
    },
    {
      key: "actions",
      label: copy.actions,
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setCouponForm(mapCoupon(row));
            setModal("coupon");
          }}
        >
          {copy.edit}
        </Button>
      ),
    },
  ];
  const subscriptionColumns = [
    {
      key: "user",
      label: copy.user,
      render: (row) => (
        <div>
          <p className="font-semibold">{row.user?.name || "—"}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {row.user?.email || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "product",
      label: copy.product,
      render: (row) =>
        readLocalized(row.product?.name, language) || row.product?.code || "—",
    },
    {
      key: "price",
      label: copy.prices,
      render: (row) =>
        row.price
          ? `${row.price.currency} ${row.price.amount} / ${row.price.billing_interval || copy.oneTime}`
          : "—",
    },
    {
      key: "renewal",
      label: copy.renewal,
      render: (row) =>
        row.renews_at ? formatLocalizedDateTime(row.renews_at, language) : "—",
    },
    {
      key: "status",
      label: copy.status,
      render: (row) => <StatusBadge value={row.status} labels={copy} />,
    },
    {
      key: "actions",
      label: copy.actions,
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSelected(row);
            setSubscriptionForm({
              status: row.status,
              renews_at: dateOnly(row.renews_at),
              ends_at: dateOnly(row.ends_at),
            });
            setModal("subscription");
          }}
        >
          {copy.updateStatus}
        </Button>
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
          tab === "products" ? (
            <Button
              onClick={() => {
                setProductForm(emptyProduct);
                setModal("product");
              }}
            >
              <Plus size={18} />
              {copy.newProduct}
            </Button>
          ) : tab === "coupons" ? (
            <Button
              onClick={() => {
                setCouponForm(emptyCoupon);
                setModal("coupon");
              }}
            >
              <Plus size={18} />
              {copy.newCoupon}
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
            value: "overview",
            label: copy.overview,
            icon: ChartNoAxesCombined,
          },
          {
            value: "products",
            label: copy.products,
            icon: PackageOpen,
            count: products.length,
          },
          {
            value: "coupons",
            label: copy.coupons,
            icon: BadgePercent,
            count: coupons.length,
          },
          {
            value: "subscriptions",
            label: copy.subscriptions,
            icon: UsersRound,
            count: subscriptions.length,
          },
        ]}
      />
      {isLoading ? (
        <OperationsLoader />
      ) : tab === "overview" ? (
        <>
          <Card>
            <CardContent className="pt-6">
              <form
                className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAppliedReportFilters(reportFilters);
                }}
              >
                <Input
                  label={copy.periodFrom}
                  type="date"
                  value={reportFilters.from}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                />
                <Input
                  label={copy.periodUntil}
                  type="date"
                  value={reportFilters.until}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      until: event.target.value,
                    }))
                  }
                />
                <Button className="self-end" type="submit">
                  <RefreshCcw size={17} />
                  {copy.refresh}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={ReceiptText}
              label={copy.paidOrders}
              value={paidOrders}
              variant="success"
            />
            <MetricTile
              icon={UsersRound}
              label={copy.activeSubscriptions}
              value={dashboard.active_subscriptions || 0}
            />
            <MetricTile
              icon={CalendarClock}
              label={copy.renewals}
              value={dashboard.renewals_due_30_days || 0}
              variant="warning"
            />
            <MetricTile
              icon={CreditCard}
              label={copy.paymentFailures}
              value={Math.max(0, failedPayments)}
              variant="danger"
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              [copy.gross, dashboard.gross_by_currency, CircleDollarSign],
              [copy.refunds, dashboard.refunds_by_currency, ReceiptText],
              [copy.discounts, dashboard.discounts_by_currency, BadgePercent],
            ].map(([title, values, icon]) => (
              <Card key={title}>
                <CardHeader className="border-b border-[var(--color-border)]">
                  <CardTitle className="flex items-center gap-2">
                    {createElement(icon, { size: 20 })}
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="space-y-3">
                    {Object.entries(values || {}).map(([currency, amount]) => (
                      <div
                        key={currency}
                        className="flex items-center justify-between rounded-xl bg-[var(--color-surface-muted)] px-4 py-3"
                      >
                        <bdi className="font-semibold">{currency}</bdi>
                        <span className="text-lg font-bold text-[var(--color-primary)]">
                          {formatLocalizedNumber(amount, language, {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                    {Object.keys(values || {}).length === 0 ? (
                      <EmptyState title={copy.noData} />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : tab === "products" ? (
        <>
          <Card>
            <CardContent className="pt-6">
              <form
                className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAppliedProductFilters(productFilters);
                }}
              >
                <Input
                  placeholder={copy.search}
                  leftIcon={<Search size={17} />}
                  value={productFilters.q}
                  onChange={(event) =>
                    setProductFilters((current) => ({
                      ...current,
                      q: event.target.value,
                    }))
                  }
                />
                <Select
                  value={productFilters.type}
                  onChange={(event) =>
                    setProductFilters((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="">{copy.allTypes}</option>
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {copy[type]}
                    </option>
                  ))}
                </Select>
                <Button type="submit">{copy.refresh}</Button>
              </form>
            </CardContent>
          </Card>
          {visibleProducts.length ? (
            <DataTableShell
              title={copy.products}
              columns={productColumns}
              rows={visibleProducts}
            />
          ) : (
            <Card>
              <EmptyState icon={PackageOpen} title={copy.noData} />
            </Card>
          )}
        </>
      ) : tab === "coupons" ? (
        coupons.length ? (
          <DataTableShell
            title={copy.coupons}
            columns={couponColumns}
            rows={coupons}
          />
        ) : (
          <Card>
            <EmptyState icon={BadgePercent} title={copy.noData} />
          </Card>
        )
      ) : subscriptions.length ? (
        <DataTableShell
          title={copy.subscriptions}
          columns={subscriptionColumns}
          rows={subscriptions}
        />
      ) : (
        <Card>
          <EmptyState icon={UsersRound} title={copy.noData} />
        </Card>
      )}

      <OperationsModal
        open={modal === "product"}
        title={productForm.id ? copy.edit : copy.newProduct}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {copy.close}
            </Button>
            <Button
              type="submit"
              form="finance-product-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? copy.saving : copy.save}
            </Button>
          </>
        }
      >
        <form
          id="finance-product-form"
          className="grid gap-5 md:grid-cols-2"
          onSubmit={saveProduct}
        >
          <Input
            label={copy.code}
            required
            value={productForm.code}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                code: event.target.value,
              }))
            }
          />
          <Select
            label={copy.type}
            value={productForm.type}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                type: event.target.value,
              }))
            }
          >
            {productTypes.map((type) => (
              <option key={type} value={type}>
                {copy[type]}
              </option>
            ))}
          </Select>
          <Input
            label={copy.nameEn}
            required
            value={productForm.name_en}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                name_en: event.target.value,
              }))
            }
          />
          <Input
            label={copy.nameAr}
            dir="rtl"
            value={productForm.name_ar}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                name_ar: event.target.value,
              }))
            }
          />
          <Input
            label={copy.nameNl}
            value={productForm.name_nl}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                name_nl: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.descriptionEn}
            value={productForm.description_en}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                description_en: event.target.value,
              }))
            }
          />
          <Textarea
            dir="rtl"
            label={copy.descriptionAr}
            value={productForm.description_ar}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                description_ar: event.target.value,
              }))
            }
          />
          <Textarea
            label={copy.descriptionNl}
            value={productForm.description_nl}
            onChange={(event) =>
              setProductForm((current) => ({
                ...current,
                description_nl: event.target.value,
              }))
            }
          />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={productForm.is_active}
              onChange={(event) =>
                setProductForm((current) => ({
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
        open={modal === "prices"}
        title={`${copy.managePrices}: ${readLocalized(selected?.name, language) || ""}`}
        size="xl"
        onClose={() => setModal(null)}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            {selected?.prices?.map((price) => (
              <button
                type="button"
                key={price.id}
                onClick={() => setPriceForm(mapPrice(price))}
                className="flex w-full items-center justify-between rounded-2xl border border-[var(--color-border)] p-4 text-start hover:border-[var(--color-primary)]"
              >
                <div>
                  <p className="font-bold">
                    {price.currency} {price.amount}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {copy[
                      price.billing_interval === "one_time"
                        ? "oneTime"
                        : price.billing_interval
                    ] || price.billing_interval}
                  </p>
                </div>
                <StatusBadge
                  value={price.is_active ? "active" : "archived"}
                  labels={{ active: copy.active, archived: copy.archived }}
                />
              </button>
            ))}
            {!selected?.prices?.length ? (
              <EmptyState icon={CreditCard} title={copy.noData} />
            ) : null}
          </div>
          <form
            className="space-y-4 rounded-2xl bg-[var(--color-surface-muted)] p-5"
            onSubmit={savePrice}
          >
            <h3 className="font-bold">
              {priceForm.id ? copy.edit : copy.addPrice}
            </h3>
            <Input
              label={copy.currency}
              required
              value={priceForm.currency}
              onChange={(event) =>
                setPriceForm((current) => ({
                  ...current,
                  currency: event.target.value,
                }))
              }
            />
            <Input
              label={copy.amount}
              type="number"
              min="0"
              step="0.01"
              required
              value={priceForm.amount}
              onChange={(event) =>
                setPriceForm((current) => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
            />
            <Select
              label={copy.billingInterval}
              value={priceForm.billing_interval}
              onChange={(event) =>
                setPriceForm((current) => ({
                  ...current,
                  billing_interval: event.target.value,
                }))
              }
            >
              <option value="one_time">{copy.oneTime}</option>
              <option value="monthly">{copy.monthly}</option>
              <option value="quarterly">{copy.quarterly}</option>
              <option value="yearly">{copy.yearly}</option>
            </Select>
            <Input
              label={copy.validFrom}
              type="date"
              value={priceForm.valid_from}
              onChange={(event) =>
                setPriceForm((current) => ({
                  ...current,
                  valid_from: event.target.value,
                }))
              }
            />
            <Input
              label={copy.validUntil}
              type="date"
              value={priceForm.valid_until}
              onChange={(event) =>
                setPriceForm((current) => ({
                  ...current,
                  valid_until: event.target.value,
                }))
              }
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={priceForm.is_active}
                onChange={(event) =>
                  setPriceForm((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
              />
              {copy.active}
            </label>
            <Button fullWidth type="submit" disabled={isSubmitting}>
              {copy.save}
            </Button>
          </form>
        </div>
      </OperationsModal>

      <OperationsModal
        open={modal === "coupon"}
        title={couponForm.id ? copy.edit : copy.newCoupon}
        size="xl"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {copy.close}
            </Button>
            <Button
              type="submit"
              form="finance-coupon-form"
              disabled={isSubmitting}
            >
              {copy.save}
            </Button>
          </>
        }
      >
        <form
          id="finance-coupon-form"
          className="grid gap-5 md:grid-cols-2"
          onSubmit={saveCoupon}
        >
          <Input
            label={copy.code}
            required
            value={couponForm.code}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                code: event.target.value,
              }))
            }
          />
          <Select
            label={copy.discountType}
            value={couponForm.discount_type}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                discount_type: event.target.value,
              }))
            }
          >
            <option value="percent">{copy.percent}</option>
            <option value="fixed">{copy.fixed}</option>
          </Select>
          <Input
            label={copy.value}
            type="number"
            min="0.01"
            step="0.01"
            required
            value={couponForm.value}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                value: event.target.value,
              }))
            }
          />
          <Input
            label={copy.currency}
            disabled={couponForm.discount_type !== "fixed"}
            required={couponForm.discount_type === "fixed"}
            value={couponForm.currency}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                currency: event.target.value,
              }))
            }
          />
          <Input
            label={copy.minimumOrder}
            type="number"
            min="0"
            step="0.01"
            value={couponForm.minimum_order}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                minimum_order: event.target.value,
              }))
            }
          />
          <Input
            label={copy.maximumDiscount}
            type="number"
            min="0.01"
            step="0.01"
            value={couponForm.maximum_discount}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                maximum_discount: event.target.value,
              }))
            }
          />
          <Input
            label={copy.redemptionLimit}
            type="number"
            min="1"
            value={couponForm.redemption_limit}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                redemption_limit: event.target.value,
              }))
            }
          />
          <Input
            label={copy.perUserLimit}
            type="number"
            min="1"
            value={couponForm.per_user_limit}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                per_user_limit: event.target.value,
              }))
            }
          />
          <Input
            label={copy.startsAt}
            type="date"
            value={couponForm.starts_at}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                starts_at: event.target.value,
              }))
            }
          />
          <Input
            label={copy.endsAt}
            type="date"
            value={couponForm.ends_at}
            onChange={(event) =>
              setCouponForm((current) => ({
                ...current,
                ends_at: event.target.value,
              }))
            }
          />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={couponForm.is_active}
              onChange={(event) =>
                setCouponForm((current) => ({
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
        open={modal === "subscription"}
        title={copy.updateStatus}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModal(null)}>
              {copy.close}
            </Button>
            <Button
              type="submit"
              form="finance-subscription-form"
              disabled={isSubmitting}
            >
              {copy.save}
            </Button>
          </>
        }
      >
        <form
          id="finance-subscription-form"
          className="space-y-5"
          onSubmit={saveSubscription}
        >
          <Select
            label={copy.status}
            value={subscriptionForm.status}
            onChange={(event) =>
              setSubscriptionForm((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
          >
            {[
              "pending",
              "active",
              "past_due",
              "paused",
              "cancelled",
              "expired",
            ].map((status) => (
              <option key={status} value={status}>
                {copy[status] || status}
              </option>
            ))}
          </Select>
          <Input
            label={copy.renewal}
            type="date"
            value={subscriptionForm.renews_at}
            onChange={(event) =>
              setSubscriptionForm((current) => ({
                ...current,
                renews_at: event.target.value,
              }))
            }
          />
          <Input
            label={copy.endsAt}
            type="date"
            value={subscriptionForm.ends_at}
            onChange={(event) =>
              setSubscriptionForm((current) => ({
                ...current,
                ends_at: event.target.value,
              }))
            }
          />
        </form>
      </OperationsModal>
    </section>
  );
}
