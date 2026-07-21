import { Component } from "react";
import { getAdminLanguage } from "../../services/languageStorage";

const copyByLanguage = {
  ar: {
    title: "حدث خطأ غير متوقع في هذه الصفحة",
    description:
      "بقية النظام يعمل بشكل طبيعي. يمكنك إعادة تحميل الصفحة أو العودة إلى لوحة القيادة.",
    retry: "إعادة تحميل الصفحة",
    home: "العودة إلى لوحة القيادة",
  },
  en: {
    title: "Something went wrong on this page",
    description:
      "The rest of the system is unaffected. You can reload this page or return to the dashboard.",
    retry: "Reload page",
    home: "Back to dashboard",
  },
  nl: {
    title: "Er is iets misgegaan op deze pagina",
    description:
      "De rest van het systeem werkt normaal. Herlaad deze pagina of ga terug naar het dashboard.",
    retry: "Pagina herladen",
    home: "Terug naar dashboard",
  },
};

/**
 * Catches render-time errors inside a routed page so a single bad payload (for
 * example an unexpected AI-advisory shape) shows a readable, recoverable error
 * instead of unmounting the entire application into a blank screen.
 */
export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the real error visible for debugging/support.
    console.error("Route render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const language = getAdminLanguage();
    const copy = copyByLanguage[language] || copyByLanguage.en;
    const isArabic = language === "ar";

    return (
      <section
        dir={isArabic ? "rtl" : "ltr"}
        role="alert"
        className="mx-auto mt-16 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
      >
        <h1 className="text-xl font-bold text-red-800">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-red-700">
          {copy.description}
        </p>
        <p className="mt-3 break-all text-xs text-red-400" dir="ltr">
          {String(this.state.error?.message || this.state.error)}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {copy.retry}
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/dashboard")}
            className="rounded-xl border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-text)]"
          >
            {copy.home}
          </button>
        </div>
      </section>
    );
  }
}
