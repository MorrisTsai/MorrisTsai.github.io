# China search setup

The public site is Simplified Chinese (`zh-CN`), rendered as crawlable HTML, and uses one canonical HTTPS host.

## One-time account setup

1. Add and verify `https://www.rewardschool.com.au/` in Baidu Search Resource Platform.
2. Submit `https://www.rewardschool.com.au/sitemap.xml` under ordinary inclusion.
3. Copy the site's API submission endpoint and keep it outside Git:

   ```powershell
   $env:BAIDU_SUBMIT_ENDPOINT = "https://data.zz.baidu.com/urls?site=https://www.rewardschool.com.au&token=REPLACE_FROM_BAIDU"
   ```

4. Add and verify the site in Bing Webmaster Tools and submit the same sitemap.
5. Confirm IndexNow receipts in Bing Webmaster Tools. The public key is hosted at `/a91e9d07b963401f9dfb895f2199d11d.txt`.

Do not commit the Baidu API endpoint because it contains the site's private submission token.

## Publishing

`deploy-code.ps1` now:

1. runs the SEO validation before packaging;
2. deploys the static HTML and crawl files;
3. submits every sitemap URL to IndexNow;
4. submits the sitemap URLs to Baidu when `BAIDU_SUBMIT_ENDPOINT` is present.

Manual commands are also available:

```powershell
.\validate-seo.ps1
.\submit-indexnow.ps1
.\submit-baidu.ps1 -Endpoint $env:BAIDU_SUBMIT_ENDPOINT
```

## Monthly checks

- Compare indexed URL counts with the sitemap in both webmaster portals.
- Review crawl errors, excluded URLs, queries, clicks, and landing pages.
- Test key pages from mainland China for blocked third-party resources and slow response times.
- Publish or materially improve pages based on real query demand; do not change `lastmod` for unchanged pages.
