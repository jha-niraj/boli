import { ProductCards } from "@/components/public/product-cards"
import { Band, Kicker, SectionTitle } from "@/components/public/section"

/** PC3: one open model and the ways in - Kura and the API live, Jawaf in pilot, Document AI and Speech soon. */
export function Products() {
    return (
        <Band id="products" tone="white" labelledBy="products-title">
            <Kicker>Products</Kicker>
            <SectionTitle>
                <span id="products-title">One open model, more ways in</span>
            </SectionTitle>
            <ProductCards className="mt-12 sm:mt-14" />
        </Band>
    )
}
