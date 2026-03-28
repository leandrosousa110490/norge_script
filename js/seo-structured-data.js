(function () {
  var origin = "https://floridasignsolution.com";
  var pathname = (window.location.pathname || "/").replace(/\/+$/, "");
  if (!pathname) pathname = "/";

  var pageMap = {
    "/": { name: "Home", canonical: origin + "/", type: "WebPage" },
    "/index.html": { name: "Home", canonical: origin + "/", type: "WebPage" },
    "/services.html": { name: "Services", canonical: origin + "/services.html", type: "Service" },
    "/portfolio.html": { name: "Portfolio", canonical: origin + "/portfolio.html", type: "CollectionPage" },
    "/about.html": { name: "About Us", canonical: origin + "/about.html", type: "AboutPage" },
    "/contact.html": { name: "Contact", canonical: origin + "/contact.html", type: "ContactPage" }
  };
  var serviceKeywords = [
    "sign installation",
    "sign repair",
    "custom sign fabrication",
    "sign design",
    "commercial signs",
    "storefront signs",
    "channel letters",
    "LED signs",
    "sign maintenance",
    "emergency sign repair",
    "sign making"
  ];

  var current = pageMap[pathname];
  if (!current) return;

  function appendJsonLd(payload) {
    try {
      var script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(payload);
      document.head.appendChild(script);
    } catch (_) {}
  }

  var webPagePayload = {
    "@context": "https://schema.org",
    "@type": current.type,
    "name": document.title || ("Florida Sign Solution - " + current.name),
    "url": current.canonical,
    "keywords": serviceKeywords.join(", "),
    "inLanguage": "en-US",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Florida Sign Solution",
      "url": origin + "/"
    },
    "about": {
      "@type": "LocalBusiness",
      "@id": origin + "/"
    }
  };
  appendJsonLd(webPagePayload);

  appendJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": origin + "/#organization",
    "name": "Florida Sign Solution",
    "url": origin + "/",
    "logo": origin + "/images/logo2.png",
    "telephone": "+17863932372",
    "email": "floridasignsolution@gmail.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Miami",
      "addressRegion": "FL",
      "addressCountry": "US"
    },
    "areaServed": {
      "@type": "State",
      "name": "Florida"
    },
    "knowsAbout": serviceKeywords
  });

  appendJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": origin + "/#website",
    "name": "Florida Sign Solution",
    "url": origin + "/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": origin + "/services.html?query={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  });

  appendJsonLd({
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": current.canonical + "#sign-services",
    "name": "Commercial Sign Services",
    "serviceType": "Sign Installation, Sign Repair, and Custom Sign Making",
    "provider": {
      "@id": origin + "/#organization"
    },
    "areaServed": {
      "@type": "State",
      "name": "Florida"
    },
    "url": current.canonical,
    "keywords": serviceKeywords.join(", ")
  });

  var breadcrumbItems = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": origin + "/"
    }
  ];
  if (current.name !== "Home") {
    breadcrumbItems.push({
      "@type": "ListItem",
      "position": 2,
      "name": current.name,
      "item": current.canonical
    });
  }
  appendJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems
  });

  if (pathname === "/services.html") {
    appendJsonLd({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Florida Sign Solution Services",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Sign Design" },
        { "@type": "ListItem", "position": 2, "name": "Sign Fabrication" },
        { "@type": "ListItem", "position": 3, "name": "Sign Installation" },
        { "@type": "ListItem", "position": 4, "name": "Sign Repair" },
        { "@type": "ListItem", "position": 5, "name": "Sign Maintenance" }
      ]
    });
  }
})();
