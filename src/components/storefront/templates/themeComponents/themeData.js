/**
 * themeComponents/themeData.js
 * Auto-generated from the 5x5x4 theme matrix (see scripts/gen-theme-data.js).
 * All 100 theme presets with full configs, idempotently stable IDs.
 * DO NOT EDIT BY HAND - regenerate with: node scripts/gen-theme-data.js
 */

export const THEME_DATA = [
  {
    id: "fashion-midnight_noir-dense_hero_bordered-crisp",
    name: "Theme 01",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-midnight_noir-dense_hero_bordered-crisp"
      },
  },
  {
    id: "fashion-midnight_noir-spacious_hero_minimal-subtle",
    name: "Theme 02",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-midnight_noir-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "fashion-midnight_noir-compact_nohero_card-rounded",
    name: "Theme 03",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-midnight_noir-compact_nohero_card-rounded"
      },
  },
  {
    id: "fashion-midnight_noir-wide_nohero_list-extra_rounded",
    name: "Theme 04",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-midnight_noir-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "fashion-golden_hour-dense_hero_bordered-crisp",
    name: "Theme 05",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-golden_hour-dense_hero_bordered-crisp"
      },
  },
  {
    id: "fashion-golden_hour-spacious_hero_minimal-subtle",
    name: "Theme 06",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-golden_hour-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "fashion-golden_hour-compact_nohero_card-rounded",
    name: "Theme 07",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-golden_hour-compact_nohero_card-rounded"
      },
  },
  {
    id: "fashion-golden_hour-wide_nohero_list-extra_rounded",
    name: "Theme 08",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-golden_hour-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "fashion-jade_district-dense_hero_bordered-crisp",
    name: "Theme 09",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-jade_district-dense_hero_bordered-crisp"
      },
  },
  {
    id: "fashion-jade_district-spacious_hero_minimal-subtle",
    name: "Theme 10",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-jade_district-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "fashion-jade_district-compact_nohero_card-rounded",
    name: "Theme 11",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-jade_district-compact_nohero_card-rounded"
      },
  },
  {
    id: "fashion-jade_district-wide_nohero_list-extra_rounded",
    name: "Theme 12",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-jade_district-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "fashion-azure_mist-dense_hero_bordered-crisp",
    name: "Theme 13",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-azure_mist-dense_hero_bordered-crisp"
      },
  },
  {
    id: "fashion-azure_mist-spacious_hero_minimal-subtle",
    name: "Theme 14",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-azure_mist-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "fashion-azure_mist-compact_nohero_card-rounded",
    name: "Theme 15",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-azure_mist-compact_nohero_card-rounded"
      },
  },
  {
    id: "fashion-azure_mist-wide_nohero_list-extra_rounded",
    name: "Theme 16",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-azure_mist-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "fashion-coral_blush-dense_hero_bordered-crisp",
    name: "Theme 17",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-coral_blush-dense_hero_bordered-crisp"
      },
  },
  {
    id: "fashion-coral_blush-spacious_hero_minimal-subtle",
    name: "Theme 18",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-coral_blush-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "fashion-coral_blush-compact_nohero_card-rounded",
    name: "Theme 19",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-coral_blush-compact_nohero_card-rounded"
      },
  },
  {
    id: "fashion-coral_blush-wide_nohero_list-extra_rounded",
    name: "Theme 20",
    category: "fashion",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Express Your Style",
              "subtitle": "Handpicked looks for every Ghanaian closet.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Fashion & Apparel Store",
              "defaultTitle": "Fashion & Apparel — DiDwa",
              "defaultDescription": "Discover the best fashion & apparel in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Fashion%20%26%20Apparel"
          },
          "themeId": "fashion-coral_blush-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "electronics-midnight_noir-dense_hero_bordered-crisp",
    name: "Theme 21",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-midnight_noir-dense_hero_bordered-crisp"
      },
  },
  {
    id: "electronics-midnight_noir-spacious_hero_minimal-subtle",
    name: "Theme 22",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-midnight_noir-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "electronics-midnight_noir-compact_nohero_card-rounded",
    name: "Theme 23",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-midnight_noir-compact_nohero_card-rounded"
      },
  },
  {
    id: "electronics-midnight_noir-wide_nohero_list-extra_rounded",
    name: "Theme 24",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-midnight_noir-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "electronics-golden_hour-dense_hero_bordered-crisp",
    name: "Theme 25",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-golden_hour-dense_hero_bordered-crisp"
      },
  },
  {
    id: "electronics-golden_hour-spacious_hero_minimal-subtle",
    name: "Theme 26",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-golden_hour-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "electronics-golden_hour-compact_nohero_card-rounded",
    name: "Theme 27",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-golden_hour-compact_nohero_card-rounded"
      },
  },
  {
    id: "electronics-golden_hour-wide_nohero_list-extra_rounded",
    name: "Theme 28",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-golden_hour-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "electronics-jade_district-dense_hero_bordered-crisp",
    name: "Theme 29",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-jade_district-dense_hero_bordered-crisp"
      },
  },
  {
    id: "electronics-jade_district-spacious_hero_minimal-subtle",
    name: "Theme 30",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-jade_district-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "electronics-jade_district-compact_nohero_card-rounded",
    name: "Theme 31",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-jade_district-compact_nohero_card-rounded"
      },
  },
  {
    id: "electronics-jade_district-wide_nohero_list-extra_rounded",
    name: "Theme 32",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-jade_district-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "electronics-azure_mist-dense_hero_bordered-crisp",
    name: "Theme 33",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-azure_mist-dense_hero_bordered-crisp"
      },
  },
  {
    id: "electronics-azure_mist-spacious_hero_minimal-subtle",
    name: "Theme 34",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-azure_mist-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "electronics-azure_mist-compact_nohero_card-rounded",
    name: "Theme 35",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-azure_mist-compact_nohero_card-rounded"
      },
  },
  {
    id: "electronics-azure_mist-wide_nohero_list-extra_rounded",
    name: "Theme 36",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-azure_mist-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "electronics-coral_blush-dense_hero_bordered-crisp",
    name: "Theme 37",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-coral_blush-dense_hero_bordered-crisp"
      },
  },
  {
    id: "electronics-coral_blush-spacious_hero_minimal-subtle",
    name: "Theme 38",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-coral_blush-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "electronics-coral_blush-compact_nohero_card-rounded",
    name: "Theme 39",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-coral_blush-compact_nohero_card-rounded"
      },
  },
  {
    id: "electronics-coral_blush-wide_nohero_list-extra_rounded",
    name: "Theme 40",
    category: "electronics",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Powered by Ghana",
              "subtitle": "Latest gadgets, local prices, fast delivery.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Electronics & Gadgets Store",
              "defaultTitle": "Electronics & Gadgets — DiDwa",
              "defaultDescription": "Discover the best electronics & gadgets in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Electronics%20%26%20Gadgets"
          },
          "themeId": "electronics-coral_blush-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "beauty-midnight_noir-dense_hero_bordered-crisp",
    name: "Theme 41",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-midnight_noir-dense_hero_bordered-crisp"
      },
  },
  {
    id: "beauty-midnight_noir-spacious_hero_minimal-subtle",
    name: "Theme 42",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-midnight_noir-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "beauty-midnight_noir-compact_nohero_card-rounded",
    name: "Theme 43",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-midnight_noir-compact_nohero_card-rounded"
      },
  },
  {
    id: "beauty-midnight_noir-wide_nohero_list-extra_rounded",
    name: "Theme 44",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-midnight_noir-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "beauty-golden_hour-dense_hero_bordered-crisp",
    name: "Theme 45",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-golden_hour-dense_hero_bordered-crisp"
      },
  },
  {
    id: "beauty-golden_hour-spacious_hero_minimal-subtle",
    name: "Theme 46",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-golden_hour-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "beauty-golden_hour-compact_nohero_card-rounded",
    name: "Theme 47",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-golden_hour-compact_nohero_card-rounded"
      },
  },
  {
    id: "beauty-golden_hour-wide_nohero_list-extra_rounded",
    name: "Theme 48",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-golden_hour-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "beauty-jade_district-dense_hero_bordered-crisp",
    name: "Theme 49",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-jade_district-dense_hero_bordered-crisp"
      },
  },
  {
    id: "beauty-jade_district-spacious_hero_minimal-subtle",
    name: "Theme 50",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-jade_district-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "beauty-jade_district-compact_nohero_card-rounded",
    name: "Theme 51",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-jade_district-compact_nohero_card-rounded"
      },
  },
  {
    id: "beauty-jade_district-wide_nohero_list-extra_rounded",
    name: "Theme 52",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-jade_district-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "beauty-azure_mist-dense_hero_bordered-crisp",
    name: "Theme 53",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-azure_mist-dense_hero_bordered-crisp"
      },
  },
  {
    id: "beauty-azure_mist-spacious_hero_minimal-subtle",
    name: "Theme 54",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-azure_mist-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "beauty-azure_mist-compact_nohero_card-rounded",
    name: "Theme 55",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-azure_mist-compact_nohero_card-rounded"
      },
  },
  {
    id: "beauty-azure_mist-wide_nohero_list-extra_rounded",
    name: "Theme 56",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-azure_mist-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "beauty-coral_blush-dense_hero_bordered-crisp",
    name: "Theme 57",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-coral_blush-dense_hero_bordered-crisp"
      },
  },
  {
    id: "beauty-coral_blush-spacious_hero_minimal-subtle",
    name: "Theme 58",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-coral_blush-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "beauty-coral_blush-compact_nohero_card-rounded",
    name: "Theme 59",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-coral_blush-compact_nohero_card-rounded"
      },
  },
  {
    id: "beauty-coral_blush-wide_nohero_list-extra_rounded",
    name: "Theme 60",
    category: "beauty",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Glow Your Way",
              "subtitle": "Beauty that speaks to every skin tone.",
              "callToAction": "Discover",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Today's Picks · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵120"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 120,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Today's Picks",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Beauty & Cosmetics Store",
              "defaultTitle": "Beauty & Cosmetics — DiDwa",
              "defaultDescription": "Discover the best beauty & cosmetics in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Beauty%20%26%20Cosmetics"
          },
          "themeId": "beauty-coral_blush-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "marketplace-midnight_noir-dense_hero_bordered-crisp",
    name: "Theme 61",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-midnight_noir-dense_hero_bordered-crisp"
      },
  },
  {
    id: "marketplace-midnight_noir-spacious_hero_minimal-subtle",
    name: "Theme 62",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-midnight_noir-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "marketplace-midnight_noir-compact_nohero_card-rounded",
    name: "Theme 63",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-midnight_noir-compact_nohero_card-rounded"
      },
  },
  {
    id: "marketplace-midnight_noir-wide_nohero_list-extra_rounded",
    name: "Theme 64",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-midnight_noir-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "marketplace-golden_hour-dense_hero_bordered-crisp",
    name: "Theme 65",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-golden_hour-dense_hero_bordered-crisp"
      },
  },
  {
    id: "marketplace-golden_hour-spacious_hero_minimal-subtle",
    name: "Theme 66",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-golden_hour-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "marketplace-golden_hour-compact_nohero_card-rounded",
    name: "Theme 67",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-golden_hour-compact_nohero_card-rounded"
      },
  },
  {
    id: "marketplace-golden_hour-wide_nohero_list-extra_rounded",
    name: "Theme 68",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-golden_hour-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "marketplace-jade_district-dense_hero_bordered-crisp",
    name: "Theme 69",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-jade_district-dense_hero_bordered-crisp"
      },
  },
  {
    id: "marketplace-jade_district-spacious_hero_minimal-subtle",
    name: "Theme 70",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-jade_district-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "marketplace-jade_district-compact_nohero_card-rounded",
    name: "Theme 71",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-jade_district-compact_nohero_card-rounded"
      },
  },
  {
    id: "marketplace-jade_district-wide_nohero_list-extra_rounded",
    name: "Theme 72",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-jade_district-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "marketplace-azure_mist-dense_hero_bordered-crisp",
    name: "Theme 73",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-azure_mist-dense_hero_bordered-crisp"
      },
  },
  {
    id: "marketplace-azure_mist-spacious_hero_minimal-subtle",
    name: "Theme 74",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-azure_mist-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "marketplace-azure_mist-compact_nohero_card-rounded",
    name: "Theme 75",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-azure_mist-compact_nohero_card-rounded"
      },
  },
  {
    id: "marketplace-azure_mist-wide_nohero_list-extra_rounded",
    name: "Theme 76",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-azure_mist-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "marketplace-coral_blush-dense_hero_bordered-crisp",
    name: "Theme 77",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-coral_blush-dense_hero_bordered-crisp"
      },
  },
  {
    id: "marketplace-coral_blush-spacious_hero_minimal-subtle",
    name: "Theme 78",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-coral_blush-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "marketplace-coral_blush-compact_nohero_card-rounded",
    name: "Theme 79",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-coral_blush-compact_nohero_card-rounded"
      },
  },
  {
    id: "marketplace-coral_blush-wide_nohero_list-extra_rounded",
    name: "Theme 80",
    category: "marketplace",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "One Market, Many Talents",
              "subtitle": "From vibrant craft markets to boutique textiles - all in one place.",
              "callToAction": "View All",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Best Sellers · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵150"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 150,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Best Sellers",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | General Marketplace Store",
              "defaultTitle": "General Marketplace — DiDwa",
              "defaultDescription": "Discover the best general marketplace in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=General%20Marketplace"
          },
          "themeId": "marketplace-coral_blush-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "groceries-midnight_noir-dense_hero_bordered-crisp",
    name: "Theme 81",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-midnight_noir-dense_hero_bordered-crisp"
      },
  },
  {
    id: "groceries-midnight_noir-spacious_hero_minimal-subtle",
    name: "Theme 82",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-midnight_noir-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "groceries-midnight_noir-compact_nohero_card-rounded",
    name: "Theme 83",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-midnight_noir-compact_nohero_card-rounded"
      },
  },
  {
    id: "groceries-midnight_noir-wide_nohero_list-extra_rounded",
    name: "Theme 84",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Midnight Noir",
              "tag": "Dark",
              "primary": "#0B1120",
              "secondary": "#0F172A",
              "accent": "#FFD700",
              "background": "#FFFFFF",
              "textPrimary": "#0B1120",
              "textSecondary": "#475569",
              "isDark": false
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#0B112005, #FFFFFF",
              "overlay": "rgba(0,0,0,0.04)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-midnight_noir-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "groceries-golden_hour-dense_hero_bordered-crisp",
    name: "Theme 85",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-golden_hour-dense_hero_bordered-crisp"
      },
  },
  {
    id: "groceries-golden_hour-spacious_hero_minimal-subtle",
    name: "Theme 86",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-golden_hour-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "groceries-golden_hour-compact_nohero_card-rounded",
    name: "Theme 87",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-golden_hour-compact_nohero_card-rounded"
      },
  },
  {
    id: "groceries-golden_hour-wide_nohero_list-extra_rounded",
    name: "Theme 88",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Golden Hour",
              "tag": "Warm Amber",
              "primary": "#78350F",
              "secondary": "#92400E",
              "accent": "#F59E0B",
              "background": "#FFFBEB",
              "textPrimary": "#451A03",
              "textSecondary": "#78350F",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#78350F05, #FFFBEB",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-golden_hour-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "groceries-jade_district-dense_hero_bordered-crisp",
    name: "Theme 89",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-jade_district-dense_hero_bordered-crisp"
      },
  },
  {
    id: "groceries-jade_district-spacious_hero_minimal-subtle",
    name: "Theme 90",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-jade_district-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "groceries-jade_district-compact_nohero_card-rounded",
    name: "Theme 91",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-jade_district-compact_nohero_card-rounded"
      },
  },
  {
    id: "groceries-jade_district-wide_nohero_list-extra_rounded",
    name: "Theme 92",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Jade District",
              "tag": "Tech Green",
              "primary": "#064E35",
              "secondary": "#065F4E",
              "accent": "#10B981",
              "background": "#ECFDF5",
              "textPrimary": "#064E35",
              "textSecondary": "#065F4E",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#064E3505, #ECFDF5",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-jade_district-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "groceries-azure_mist-dense_hero_bordered-crisp",
    name: "Theme 93",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-azure_mist-dense_hero_bordered-crisp"
      },
  },
  {
    id: "groceries-azure_mist-spacious_hero_minimal-subtle",
    name: "Theme 94",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-azure_mist-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "groceries-azure_mist-compact_nohero_card-rounded",
    name: "Theme 95",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-azure_mist-compact_nohero_card-rounded"
      },
  },
  {
    id: "groceries-azure_mist-wide_nohero_list-extra_rounded",
    name: "Theme 96",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Azure Mist",
              "tag": "Minimal Blue",
              "primary": "#0C4A6E",
              "secondary": "#0EA5E9",
              "accent": "#0EA5E9",
              "background": "#F0F9FF",
              "textPrimary": "#0C4A6E",
              "textSecondary": "#334159",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#0C4A6E05, #F0F9FF",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-azure_mist-wide_nohero_list-extra_rounded"
      },
  },
  {
    id: "groceries-coral_blush-dense_hero_bordered-crisp",
    name: "Theme 97",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "bordered",
              "gridGap": "1rem",
              "productCardRounded": "0rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0rem",
              "name": "Crisp",
              "buttons": "0rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-coral_blush-dense_hero_bordered-crisp"
      },
  },
  {
    id: "groceries-coral_blush-spacious_hero_minimal-subtle",
    name: "Theme 98",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": true,
              "heroHeight": "560px",
              "cardStyle": "minimal",
              "gridGap": "1.25rem",
              "productCardRounded": "0.375rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.375rem",
              "name": "Subtle",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": true,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": true,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-coral_blush-spacious_hero_minimal-subtle"
      },
  },
  {
    id: "groceries-coral_blush-compact_nohero_card-rounded",
    name: "Theme 99",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 3,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "compact",
              "gridGap": "0.75rem",
              "productCardRounded": "0.75rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "0.75rem",
              "name": "Rounded",
              "buttons": "0.375rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 3
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 3
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-coral_blush-compact_nohero_card-rounded"
      },
  },
  {
    id: "groceries-coral_blush-wide_nohero_list-extra_rounded",
    name: "Theme 100",
    category: "groceries",
    config:       {
          "version": 1,
          "generatedAt": "2026-10-21T00:00:00.000Z",
          "locale": {
              "currency": "GHS",
              "currencySymbol": "₵",
              "languageTag": "en-GH",
              "phonePrefix": "233",
              "dateFormat": "DD/MM/YYYY"
          },
          "palette": {
              "name": "Coral Blush",
              "tag": "Pastel Red",
              "primary": "#7F1D1D",
              "secondary": "#B91C1C",
              "accent": "#F87171",
              "background": "#FEF2F2",
              "textPrimary": "#450A0A",
              "textSecondary": "#7F1D1D",
              "isDark": true
          },
          "layout": {
              "gridColumns": 4,
              "heroBanner": false,
              "heroHeight": "0px",
              "cardStyle": "minimal",
              "gridGap": "1rem",
              "productCardRounded": "1.5rem",
              "showProductImages": true,
              "showDiscountBadge": true,
              "stickyHeader": true
          },
          "borderRadius": {
              "base": "1.5rem",
              "name": "Extra Rounded",
              "buttons": "1.5rem"
          },
          "typography": {
              "headingFont": "Poppins, system-ui, sans-serif",
              "bodyFont": "Inter, system-ui, sans-serif",
              "baseFontSize": 16,
              "headingScale": 1.25,
              "buttonWeight": 600
          },
          "hero": {
              "enabled": false,
              "title": "Groceries at Your Door",
              "subtitle": "Fresh from market, delivered same-day nationwide.",
              "callToAction": "Order Now",
              "bgGradient": "#7F1D1D05, #FEF2F2",
              "overlay": "rgba(255,255,255,0.08)"
          },
          "sections": [
              {
                  "key": "hero",
                  "enabled": false,
                  "order": 1
              },
              {
                  "key": "urgency",
                  "enabled": true,
                  "order": 2,
                  "text": "Delivery in 60 min · Shipping nationwide"
              },
              {
                  "key": "categories",
                  "enabled": true,
                  "order": 3,
                  "columns": 4
              },
              {
                  "key": "products-grid",
                  "enabled": true,
                  "order": 4,
                  "columns": 4
              },
              {
                  "key": "social-proof",
                  "enabled": true,
                  "order": 5,
                  "source": "ratings"
              },
              {
                  "key": "cta-banner",
                  "enabled": true,
                  "order": 6,
                  "text": "Free delivery on orders over ₵100"
              },
              {
                  "key": "footer",
                  "enabled": true,
                  "order": 7
              }
          ],
          "conversion": {
              "currency": "GHS",
              "freeShippingThresholdGHS": 100,
              "codEnabled": true,
              "momoEnabled": true,
              "mobileMoneyProviders": [
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo"
              ],
              "whatsappFab": true,
              "whatsappCountryCode": "233",
              "urgencyTicker": "Delivery in 60 min",
              "lowStockBadge": true,
              "mobileOptimized": true,
              "trustBadges": [
                  {
                      "label": "GH Secured",
                      "icon": "shield"
                  },
                  {
                      "label": "24-Hr Delivery",
                      "icon": "clock"
                  },
                  {
                      "label": "Cash or MoMo",
                      "icon": "wallet"
                  }
              ]
          },
          "paymentBadges": [
              "MTN MoMo",
              "Vodafone Cash",
              "AirtelTigo",
              "Cash on Delivery"
          ],
          "seo": {
              "titleTemplate": "%s | Groceries & Supermarket Store",
              "defaultTitle": "Groceries & Supermarket — DiDwa",
              "defaultDescription": "Discover the best groceries & supermarket in Ghana. Fast delivery, GHS prices, MoMo accepted.",
              "ogImage": "/api/og?title=Groceries%20%26%20Supermarket"
          },
          "themeId": "groceries-coral_blush-wide_nohero_list-extra_rounded"
      },
  },
];

export const THEME_BY_ID = Object.fromEntries(THEME_DATA.map(t => [t.id, t]));

