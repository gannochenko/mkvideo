The <fragment> tag can contain two types of child nodes:

### Container

<container> ... </container>

In this case the Puppeteer must treat this as static html, wrap it with some body and head, with style reset and render (as now)

### App

<app
    src="../apps/central_text/dst"
    data-parameters="{outro: true}"
/>

In this case it looks for the index.html file at "src" and tries to load it, no additiona wrapping with statis html is needed. This is going to be some app (usually react). In this case we wait for it to be rendered using that mechanism I described before.

We should be able to inject additional parameters via query parameters, if data-parameters contains valid JSON. Also metadata must be auto injected: title, date, tags.
