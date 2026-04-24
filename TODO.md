يضاا# Vendor UI Improvements - Plan Approved

**Information Gathered:**
- page.tsx: Floating + button bottom-left small
- StoreView.tsx: Order cards no cancel, ChevronLeft details dummy
- orders.ts: cancelOrder() ready, updateOrderStatus

**Plan:**
1. page.tsx: + → big green 'إضافة طلب جديد' button center-bottom
2. StoreView.tsx: Add cancel button per order (if pending/assigned)
3. DriverOrdersView.tsx: Add accept/auto-accept toggle + details modal
4. Test: npm run build:mobile

**Followup:** npm install && npm run build:mobile

✅ Plan approved & test build running
