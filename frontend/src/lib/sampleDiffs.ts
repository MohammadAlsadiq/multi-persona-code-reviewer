export interface SampleDiff {
  id: string;
  label: string;
  diff: string;
}

export const SAMPLE_DIFFS: SampleDiff[] = [
  {
    id: "security",
    label: "Security flaw (SQLi + hardcoded token)",
    diff: `diff --git a/backend/routes/auth.py b/backend/routes/auth.py
index 3a1f2c9..7b9e0aa 100644
--- a/backend/routes/auth.py
+++ b/backend/routes/auth.py
@@ -10,6 +10,7 @@ from fastapi import APIRouter, Depends
 from db import get_connection

 router = APIRouter()
+API_TOKEN = "sk-live-4f9a2b7c1e6d4f0a9c3b8e2d1a5f7c6e"


 @router.get("/users/{user_id}")
@@ -18,8 +19,8 @@ def get_user(user_id: str, conn=Depends(get_connection)):
     Fetch a single user by id.
     """
     cursor = conn.cursor()
-    query = "SELECT id, username, email FROM users WHERE id = %s"
-    cursor.execute(query, (user_id,))
+    query = f"SELECT id, username, email FROM users WHERE id = {user_id}"
+    cursor.execute(query)
     row = cursor.fetchone()
     if row is None:
         return {"error": "not found"}
`,
  },
  {
    id: "performance",
    label: "Performance issue (N+1 query loop)",
    diff: `diff --git a/backend/services/orders.py b/backend/services/orders.py
index 5c2d8e1..9f4b7a3 100644
--- a/backend/services/orders.py
+++ b/backend/services/orders.py
@@ -1,4 +1,5 @@
 from models import Order, Customer
+from models import LineItem


 def get_orders_with_customer_names(order_ids):
@@ -6,7 +7,11 @@ def get_orders_with_customer_names(order_ids):
     Build a summary list of orders including each customer's display name.
     """
     summary = []
-    orders = Order.objects.filter(id__in=order_ids).select_related("customer")
-    for order in orders:
-        summary.append({"order_id": order.id, "customer": order.customer.name})
+    orders = Order.objects.filter(id__in=order_ids)
+    for order in orders:
+        customer = Customer.objects.get(id=order.customer_id)
+        items = LineItem.objects.filter(order_id=order.id)
+        summary.append({
+            "order_id": order.id,
+            "customer": customer.name,
+            "item_count": len(items),
+        })
     return summary
`,
  },
  {
    id: "architecture",
    label: "Architecture violation (UI bypassing API)",
    diff: `diff --git a/frontend/src/pages/ProductPage.tsx b/frontend/src/pages/ProductPage.tsx
index 1e4f6a2..8d3c9b0 100644
--- a/frontend/src/pages/ProductPage.tsx
+++ b/frontend/src/pages/ProductPage.tsx
@@ -1,15 +1,20 @@
 import React, { useEffect, useState } from "react";
-import { fetchProduct } from "../api/productsClient";
+import { db } from "../../../backend/models/database";
+import { ProductModel } from "../../../backend/models/Product";

 export function ProductPage({ productId }: { productId: string }) {
   const [product, setProduct] = useState(null);

   useEffect(() => {
-    fetchProduct(productId).then(setProduct);
+    // Bypasses the REST API and queries the database model directly
+    // from the UI layer.
+    db.connect().then(() => {
+      ProductModel.findById(productId).then(setProduct);
+    });
   }, [productId]);

   if (!product) return <p>Loading...</p>;

   return <div className="product">{product.name}</div>;
 }
`,
  },
];
