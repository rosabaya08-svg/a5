const tabletLoginPath = "/tablet/login/";

export default function Page() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <meta httpEquiv="refresh" content={`0; url=${tabletLoginPath}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(tabletLoginPath)});`,
        }}
      />
      <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
        <p className="text-sm font-normal text-slate-500">A5 폐쇄몰</p>
        <h1 className="mt-2 text-2xl font-normal">폐쇄몰 로그인으로 이동합니다</h1>
        <a
          className="mt-5 inline-flex rounded-md bg-slate-950 px-5 py-3 text-sm font-normal text-white"
          href={tabletLoginPath}
        >
          바로 이동
        </a>
      </section>
    </main>
  );
}
