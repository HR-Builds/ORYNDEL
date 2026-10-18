from app.database import SessionLocal
from app.models import Product, PromoCode, slugify

PRODUCTS = [
    {
        "name": "Onyx Wool Overcoat",
        "category": "clothing",
        "price": 14999,
        "stock": 12,
        "description": "A double-faced wool overcoat with a structured shoulder and horn buttons. Cut for layering through the coldest months, finished entirely by hand.",
        "seo_tags": "wool overcoat, winter coat, mens outerwear, tailored coat",
    },
    {
        "name": "Ivory Silk Overshirt",
        "category": "clothing",
        "price": 8499,
        "stock": 20,
        "description": "Heavyweight mulberry silk overshirt with corozo buttons and a relaxed drape. Wears like a jacket, feels like air.",
        "seo_tags": "silk shirt, overshirt, luxury shirt",
    },
    {
        "name": "Suede Chelse Boots",
        "category": "footwear",
        "price": 18999,
        "stock": 8,
        "description": "Unlined calf-suede Chelse boots on a leather sole. Weatherproofed, resoleable, and shaped on a classic English last.",
        "seo_tags": "chelsea boots, suede boots, leather footwear",
    },
    {
        "name": "Courtside Leather Sneaker",
        "category": "footwear",
        "price": 11999,
        "stock": 15,
        "description": "Full-grain white leather sneaker with a margom-style cupsole. Ages beautifully, pairs with everything.",
        "seo_tags": "white sneakers, leather sneakers, minimal shoes",
    },
    {
        "name": "Oud & Ember Eau de Parfum",
        "category": "fragrance",
        "price": 12999,
        "stock": 25,
        "description": "Smoked Cambodian oud layered over ember, black amber and dry cedar. A slow burn of a fragrance that lasts past midnight. 100ml.",
        "seo_tags": "oud perfume, mens fragrance, niche perfume",
    },
    {
        "name": "Vetiver Absolu Extrait",
        "category": "fragrance",
        "price": 9999,
        "stock": 18,
        "description": "Haitian vetiver root, grapefruit peel and warm cashmere wood. Earthy, green and quietly confident. 50ml.",
        "seo_tags": "vetiver perfume, fresh fragrance, extrait",
    },
    {
        "name": "Antique Gold Signet Ring",
        "category": "accessories",
        "price": 6499,
        "stock": 30,
        "description": "A solid brass signet with a hand-brushed antique gold finish. Engravable face, made to be worn every day.",
        "seo_tags": "signet ring, gold ring, mens jewelry",
    },
    {
        "name": "Noir Leather Cardholder",
        "category": "accessories",
        "price": 3999,
        "stock": 40,
        "description": "Six-card holder in vegetable-tanned black leather with hand-painted edges. Slim enough to disappear in a pocket.",
        "seo_tags": "cardholder, leather wallet, slim wallet",
    },
    {
        "name": "Matte Velvet Lipstick — Oxblood",
        "category": "cosmetics",
        "price": 2499,
        "stock": 50,
        "description": "A weightless matte velvet formula in deep oxblood. One swipe, eight hours, zero cracking.",
        "seo_tags": "matte lipstick, oxblood lipstick, longwear",
    },
    {
        "name": "Rose Noir Face Oil",
        "category": "cosmetics",
        "price": 4499,
        "stock": 22,
        "description": "Cold-pressed rosehip and squalane blend with a whisper of damask rose. Absorbs in seconds, glows for hours.",
        "seo_tags": "face oil, rosehip oil, skincare",
    },
]

PROMOS = [
    {"code": "WELCOME10", "discount_percent": 10},
    {"code": "ORYNDEL15", "discount_percent": 15},
]


def main():
    db = SessionLocal()
    try:
        created = 0
        for data in PRODUCTS:
            slug = slugify(data["name"])
            if db.query(Product).filter(Product.slug == slug).first():
                continue
            db.add(Product(slug=slug, is_active=True, **data))
            created += 1

        for p in PROMOS:
            if not db.query(PromoCode).filter(PromoCode.code == p["code"]).first():
                db.add(PromoCode(code=p["code"], active=True, **{"discount_percent": p["discount_percent"]}))

        db.commit()
        print(f"Seeded {created} new products. Promo codes: WELCOME10, ORYNDEL15.")
        print("Upload product images from Admin > Products to complete the catalog.")
    finally:
        db.close()


if __name__ == "__main__":
    main()