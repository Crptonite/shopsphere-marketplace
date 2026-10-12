INSERT INTO categories (name, slug, sort_order) VALUES
('Phones & Tech','phones-tech',1),('Fashion','fashion',2),('Home & Living','home-living',3),('Accessories','accessories',4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO model_families (brand, family_name, model_name, generation, category_slug, official_url, is_current) VALUES
('Apple','iPhone 18 family','iPhone 18 Pro','18','phones','https://www.apple.com/sg/iphone/',true),
('Apple','iPhone 18 family','iPhone 18 Pro Max','18','phones','https://www.apple.com/sg/shop/buy-iphone',true),
('Apple','Foldable iPhone family','iPhone Duo','Duo','phones','https://www.apple.com/sg/iphone/',true),
('Apple','iPhone Air family','iPhone Air','Air','phones','https://www.apple.com/sg/iphone/',true),
('Apple','iPhone 17 family','iPhone 17','17','phones','https://www.apple.com/sg/iphone/',true),
('Apple','iPhone 17 family','iPhone 17e','17e','phones','https://www.apple.com/sg/iphone/',true),
('Samsung','Galaxy S family','Galaxy S26 Ultra','S26','phones','https://www.samsung.com/sg/smartphones/',true),
('Samsung','Galaxy Z family','Galaxy Z Fold8','Fold8','phones','https://www.samsung.com/sg/smartphones/',true),
('Samsung','Galaxy Z family','Galaxy Z Fold8 Ultra','Fold8 Ultra','phones','https://www.samsung.com/sg/smartphones/',true),
('Samsung','Galaxy Z family','Galaxy Z Flip8','Flip8','phones','https://www.samsung.com/sg/smartphones/',true),
('Samsung','Galaxy A family','Galaxy A series','A','phones','https://www.samsung.com/sg/smartphones/',true)
ON CONFLICT (brand, model_name) DO NOTHING;

-- All records below are deliberately labelled sample/demo listings. These are not live offers.
INSERT INTO products (id,title,brand,model,category,price_sgd,condition,location,image_url,seller_display_name,description,is_sample,status)
VALUES
('demo-iphone-18-pro-max','iPhone 18 Pro Max 256GB','Apple','iPhone 18 Pro Max','Phones',2199,'New','Orchard','https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85','Demo Mobile Store','Illustrative demo offer; verify availability and seller before purchase.',true,'active'),
('demo-iphone-18-pro','iPhone 18 Pro 256GB','Apple','iPhone 18 Pro','Phones',1899,'New','Bugis','https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85','Demo Tech Hub','Illustrative demo offer; not a verified live listing.',true,'active'),
('demo-iphone-17-pro-max','iPhone 17 Pro Max 256GB','Apple','iPhone 17 Pro Max','Phones',1599,'Like new','Tampines','https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85','Sample Seller A','Sample resale listing with illustrative price and condition.',true,'active'),
('demo-iphone-air','iPhone Air 256GB','Apple','iPhone Air','Phones',1749,'New','Jurong East','https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85','Demo Mobile Store','Illustrative demo offer; not verified stock.',true,'active'),
('demo-galaxy-s26-ultra','Samsung Galaxy S26 Ultra 256GB','Samsung','Galaxy S26 Ultra','Phones',1798,'New','City Hall','https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85','Sample Galaxy Store','Illustrative demo offer; confirm official specs and availability.',true,'active'),
('demo-galaxy-z-fold8','Samsung Galaxy Z Fold8 512GB','Samsung','Galaxy Z Fold8','Phones',2498,'New','Woodlands','https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85','Sample Galaxy Store','Illustrative demo offer; not a verified live listing.',true,'active'),
('demo-iphone-case','MagSafe-compatible phone case','Accessories','Phone case','Accessories',19,'New','Queenstown','https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?auto=format&fit=crop&w=900&q=85','Sample Accessories','Generic sample accessory listing; confirm compatibility.',true,'active')
ON CONFLICT (id) DO NOTHING;
