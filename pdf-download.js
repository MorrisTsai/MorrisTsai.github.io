(() => {
  "use strict";

  const PAGE_WIDTH = 794;
  const PAGE_HEIGHT = 1123;
  const PAGE_PADDING_X = 42;
  const PAGE_PADDING_TOP = 38;
  const PAGE_PADDING_BOTTOM = 42;
  const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;

  const baseCss = `
    *{box-sizing:border-box} .rs-pdf-stage{position:fixed;left:-100000px;top:0;width:${PAGE_WIDTH}px;background:#fff;color:#10234a;font-family:"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",Arial,sans-serif;line-height:1.35;z-index:-1}
    .rs-pdf-page{width:${PAGE_WIDTH}px;min-height:${PAGE_HEIGHT}px;padding:${PAGE_PADDING_TOP}px ${PAGE_PADDING_X}px ${PAGE_PADDING_BOTTOM}px;background:#fff;overflow:hidden}
    .rs-pdf-page+.rs-pdf-page{margin-top:12px}.rs-pdf-content{width:100%}.rs-pdf-cover{padding:0 0 16px;margin:0 0 13px;border-bottom:3px solid #c9912f}.rs-pdf-brand{margin:0 0 5px;color:#0b4b9d;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.rs-pdf-cover h1{margin:0;color:#071f49;font-size:27px;line-height:1.15;letter-spacing:-.02em}.rs-pdf-subtitle{margin:6px 0 0;color:#5e6f87;font-size:11px}.rs-pdf-filters{display:flex;flex-wrap:wrap;gap:4px;margin-top:9px}.rs-pdf-filters span{padding:3px 7px;border-radius:999px;background:#eaf2fc;color:#164e91;font-size:8px;font-weight:700}.rs-pdf-note{margin:10px 0 0;padding:7px 9px;border-left:3px solid #c9912f;background:#fff8e9;color:#665330;font-size:9px}.rs-pdf-block{width:100%}.rs-pdf-block+.rs-pdf-block{margin-top:5px}
  `;

  function safeFilename(value) {
    return String(value || "reward-school.pdf")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "reward-school.pdf";
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function createPage(stage) {
    const page = document.createElement("section");
    page.className = "rs-pdf-page";
    const content = document.createElement("div");
    content.className = "rs-pdf-content";
    page.append(content);
    stage.append(page);
    return { page, content, used: 0 };
  }

  function createCover(options) {
    const cover = document.createElement("header");
    cover.className = "rs-pdf-cover";
    const filters = (options.filters || []).filter(Boolean);
    cover.innerHTML = `<p class="rs-pdf-brand">Reward School · Compact PDF</p><h1>${options.escape(options.title)}</h1><p class="rs-pdf-subtitle">${options.escape(options.subtitle || "")}</p>${filters.length ? `<div class="rs-pdf-filters">${filters.map((item) => `<span>${options.escape(item)}</span>`).join("")}</div>` : ""}${options.note ? `<p class="rs-pdf-note">${options.escape(options.note)}</p>` : ""}`;
    return cover;
  }

  async function download(options) {
    if (!window.html2canvas || !window.jspdf?.jsPDF) throw new Error("PDF 组件尚未加载，请刷新页面后重试。");
    const blocks = (options.blocks || []).filter(Boolean);
    if (!blocks.length) throw new Error("没有可导出的内容。");

    const stage = document.createElement("div");
    stage.className = "rs-pdf-stage";
    const style = document.createElement("style");
    style.textContent = `${baseCss}\n${options.css || ""}`;
    stage.append(style);
    document.body.append(stage);

    try {
      let current = createPage(stage);
      const cover = createCover(options);
      current.content.append(cover);
      current.used = cover.getBoundingClientRect().height;

      for (let index = 0; index < blocks.length; index += 1) {
        const block = document.createElement("div");
        block.className = "rs-pdf-block";
        block.innerHTML = blocks[index];
        current.content.append(block);
        const height = block.getBoundingClientRect().height + 5;
        if (current.used > 0 && current.used + height > CONTENT_HEIGHT) {
          block.remove();
          current = createPage(stage);
          current.content.append(block);
        }
        current.used += height;
        if (index % 120 === 0) {
          options.onProgress?.({ phase: "layout", current: index + 1, total: blocks.length });
          await nextFrame();
        }
      }

      await document.fonts?.ready;
      await nextFrame();
      const pages = [...stage.querySelectorAll(".rs-pdf-page")];
      const pdf = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      let outputPage = 0;

      for (let index = 0; index < pages.length; index += 1) {
        options.onProgress?.({ phase: "render", current: index + 1, total: pages.length });
        const canvas = await window.html2canvas(pages[index], {
          backgroundColor: "#ffffff",
          scale: options.scale || (window.devicePixelRatio > 1.5 ? 1.2 : 1.35),
          useCORS: true,
          logging: false,
          width: PAGE_WIDTH,
          windowWidth: PAGE_WIDTH,
          scrollX: 0,
          scrollY: 0,
        });
        const sliceHeight = Math.round(canvas.width * PAGE_HEIGHT / PAGE_WIDTH);
        for (let offset = 0; offset < canvas.height; offset += sliceHeight) {
          const height = Math.min(sliceHeight, canvas.height - offset);
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = sliceHeight;
          const context = slice.getContext("2d", { alpha: false });
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, slice.width, slice.height);
          context.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
          if (outputPage > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(slice.toDataURL("image/jpeg", options.quality || 0.78), "JPEG", 0, 0, 210, 297, undefined, "FAST");
          outputPage += 1;
          slice.width = 1;
          slice.height = 1;
        }
        canvas.width = 1;
        canvas.height = 1;
        await nextFrame();
      }

      for (let pageNumber = 1; pageNumber <= outputPage; pageNumber += 1) {
        pdf.setPage(pageNumber);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(105, 118, 139);
        pdf.text(`${pageNumber} / ${outputPage}`, 197, 292, { align: "right" });
      }
      options.onProgress?.({ phase: "save", current: outputPage, total: outputPage });
      pdf.save(safeFilename(options.filename).replace(/\.pdf$/i, "") + ".pdf");
      return { pages: outputPage, items: blocks.length };
    } finally {
      stage.remove();
    }
  }

  window.rewardSchoolPdf = { download };
})();
