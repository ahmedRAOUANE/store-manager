import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Coins,
  Package,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Workflow,
} from "lucide-react";

const features = [
  {
    icon: Receipt,
    title: "Simpler calculations",
    description:
      "Let the system handle totals, payments, discounts, taxes, and outstanding amounts so you spend less time calculating.",
  },
  {
    icon: Package,
    title: "Organized inventory",
    description:
      "Keep your products, stock quantities, costs, and selling prices organized and easy to understand.",
  },
  {
    icon: Coins,
    title: "Clear financial tracking",
    description:
      "Track sales, purchases, payments, and amounts due without keeping everything in your head or scattered across notebooks.",
  },
  {
    icon: Workflow,
    title: "A smoother workflow",
    description:
      "Bring sales, purchases, suppliers, products, and store members into one organized workspace.",
  },
];

const workflow = [
  {
    number: "01",
    icon: Store,
    title: "Create or join a store",
    description:
      "Start your own store or join an existing one and work from the same organized workspace.",
  },
  {
    number: "02",
    icon: Users,
    title: "Set up your team",
    description:
      "Invite members and assign roles so everyone knows what they can access and manage.",
  },
  {
    number: "03",
    icon: Package,
    title: "Organize your products",
    description:
      "Keep your products and stock information structured and ready for everyday operations.",
  },
  {
    number: "04",
    icon: ShoppingCart,
    title: "Manage sales and purchases",
    description:
      "Record transactions and let the system take care of the calculations and totals.",
  },
];

const managementItems = [
  "Sales and payments",
  "Products and stock",
  "Purchases and suppliers",
  "Store members",
  "Roles and permissions",
  "Multiple stores",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-outline-variant/60 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-on-primary">
              <Store className="size-5" strokeWidth={2} />
            </span>
            <span className="text-base">Store Manager</span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-on-surface-variant transition hover:text-on-surface"
            >
              Features
            </Link>
            <Link
              href="#workflow"
              className="text-sm font-medium text-on-surface-variant transition hover:text-on-surface"
            >
              How it works
            </Link>
            <Link
              href="#management"
              className="text-sm font-medium text-on-surface-variant transition hover:text-on-surface"
            >
              Management
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {/* <Link
              href="/dashboard"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface sm:inline-flex"
            >
              Sign in
            </Link> */}

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-on-primary shadow-floating transition hover:bg-primary-container"
            >
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface-variant">
              <span className="size-1.5 rounded-full bg-success" />
              Everything your store needs in one place
            </div>

            <h1 className="text-display-lg sm:text-5xl lg:text-6xl">
              Run your store with{" "}
              <span className="text-secondary">less work.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-body-lg text-on-surface-variant sm:text-lg">
              Manage sales, purchases, products, suppliers, and your team from
              one organized workspace. Let Store Manager handle the
              calculations while you focus on running your business.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary shadow-floating transition hover:bg-primary-container"
              >
                Start managing your store
                <ArrowRight className="size-4" />
              </Link>

              <a
                href="#features"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-lowest px-5 text-sm font-semibold text-on-surface transition hover:bg-surface-low"
              >
                Explore features
                <ChevronRight className="size-4" />
              </a>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="mx-auto mt-16 max-w-5xl lg:mt-20">
            <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-lowest shadow-overlay">
              <div className="flex h-11 items-center gap-2 border-b border-outline-variant bg-surface-low px-4">
                <span className="size-2.5 rounded-full bg-danger" />
                <span className="size-2.5 rounded-full bg-warning" />
                <span className="size-2.5 rounded-full bg-success" />
                <div className="ml-3 h-5 max-w-64 flex-1 rounded bg-surface-container" />
              </div>

              <div className="grid min-h-80 lg:grid-cols-[180px_1fr]">
                <aside className="hidden border-r border-outline-variant bg-surface-low p-4 lg:block">
                  <div className="mb-6 h-7 w-28 rounded bg-surface-high" />

                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <div
                        key={item}
                        className={`h-8 rounded ${item === 1
                            ? "bg-primary"
                            : "bg-surface-container"
                          }`}
                      />
                    ))}
                  </div>
                </aside>

                <div className="p-5 sm:p-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 w-28 rounded bg-surface-container" />
                      <div className="mt-2 h-7 w-44 rounded bg-surface-high" />
                    </div>

                    <div className="hidden h-9 w-24 rounded-md bg-secondary sm:block" />
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    <DashboardCard
                      icon={<BarChart3 className="size-4" />}
                      label="Sales"
                      value="$12,480"
                    />
                    <DashboardCard
                      icon={<Package className="size-4" />}
                      label="Products"
                      value="248"
                    />
                    <DashboardCard
                      icon={<Truck className="size-4" />}
                      label="Purchases"
                      value="$6,320"
                    />
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
                    <div className="rounded-md border border-outline-variant p-4">
                      <div className="mb-5 h-4 w-32 rounded bg-surface-container" />

                      <div className="flex h-28 items-end gap-2">
                        {[40, 65, 48, 78, 58, 92, 72, 85, 60, 75, 90, 68].map(
                          (height, index) => (
                            <div
                              key={index}
                              className="flex-1 rounded-t-sm bg-secondary/80"
                              style={{ height: `${height}%` }}
                            />
                          ),
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border border-outline-variant p-4">
                      <div className="mb-4 h-4 w-28 rounded bg-surface-container" />

                      <div className="space-y-3">
                        {[1, 2, 3].map((item) => (
                          <div
                            key={item}
                            className="flex items-center justify-between"
                          >
                            <div className="h-7 w-24 rounded bg-surface-container" />
                            <div className="h-4 w-16 rounded bg-surface-high" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-y border-outline-variant/70 bg-surface-lowest"
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="label-caps text-secondary">Built for everyday work</p>

            <h2 className="mt-3 text-headline-lg sm:text-3xl">
              Spend less time managing numbers and more time managing your
              store.
            </h2>

            <p className="mt-4 text-body-lg text-on-surface-variant">
              Store Manager brings the repetitive parts of store management
              into one clear workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-lg border border-outline-variant bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-floating"
                >
                  <div className="flex size-10 items-center justify-center rounded-md bg-info-bg text-info">
                    <Icon className="size-5" />
                  </div>

                  <h3 className="mt-5 text-headline-sm">{feature.title}</h3>

                  <p className="mt-2 text-body-md text-on-surface-variant">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="label-caps text-secondary">How it works</p>

              <h2 className="mt-3 text-headline-lg sm:text-3xl">
                One workflow for your whole store.
              </h2>

              <p className="mt-4 max-w-lg text-body-lg text-on-surface-variant">
                Keep your team, inventory, transactions, and suppliers
                connected without turning your daily work into a pile of
                spreadsheets and notes.
              </p>

              <Link
                href="/dashboard"
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:underline"
              >
                Create your store
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {workflow.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.number}
                    className="grid gap-5 rounded-lg border border-outline-variant bg-surface-lowest p-5 sm:grid-cols-[56px_1fr] sm:p-6"
                  >
                    <div className="flex size-12 items-center justify-center rounded-md bg-surface-container text-on-surface">
                      <Icon className="size-5" />
                    </div>

                    <div>
                      <span className="text-label-sm text-on-surface-variant">
                        {item.number}
                      </span>

                      <h3 className="mt-1 text-headline-sm">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-body-md text-on-surface-variant">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Management */}
      <section
        id="management"
        className="bg-primary text-on-primary"
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="label-caps text-primary-fixed">
                Everything connected
              </p>

              <h2 className="mt-3 text-headline-lg sm:text-3xl">
                Your store operations, organized in one place.
              </h2>

              <p className="mt-5 max-w-xl text-body-lg text-primary-fixed">
                From the first sale of the day to the last purchase, keep the
                information your team needs close at hand.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {managementItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Check className="size-3.5" />
                  </span>

                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roles / team */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-info-bg text-info">
              <ShieldCheck className="size-5" />
            </div>

            <h2 className="mt-5 text-headline-lg sm:text-3xl">
              Give every team member the right access.
            </h2>

            <p className="mt-4 text-body-lg text-on-surface-variant">
              Create stores, invite members, and manage roles so your team can
              work together without giving everyone access to everything.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              {
                role: "Owner",
                description: "Full control of the store",
              },
              {
                role: "Manager",
                description: "Manage day-to-day operations",
              },
              {
                role: "Staff",
                description: "Focus on assigned tasks",
              },
            ].map((item) => (
              <div
                key={item.role}
                className="rounded-lg border border-outline-variant bg-surface-lowest p-5 text-center"
              >
                <div className="text-title-md">{item.role}</div>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-outline-variant bg-surface-low">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-24">
          <h2 className="text-headline-lg sm:text-3xl">
            Make your store easier to manage.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-body-lg text-on-surface-variant">
            Bring your sales, purchases, products, suppliers, and team into
            one organized workflow.
          </p>

          <div className="mt-7">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary shadow-floating transition hover:bg-primary-container"
            >
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-variant bg-surface-lowest">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-on-primary">
              <Store className="size-4" />
            </span>
            Store Manager
          </Link>

          <p className="text-body-sm text-on-surface-variant">
            Manage your store. Simplify your workflow.
          </p>
        </div>
      </footer>
    </main>
  );
}

function DashboardCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-outline-variant bg-surface-lowest p-4">
      <div className="flex items-center gap-2 text-on-surface-variant">
        {icon}
        <span className="text-body-sm">{label}</span>
      </div>

      <div className="mt-3 text-numeric-lg">{value}</div>
    </div>
  );
}