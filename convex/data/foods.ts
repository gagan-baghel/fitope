/**
 * Indian-first food library. Values are per 100 g / 100 ml of the food in the stated
 * state (cooked vs raw matters a lot for dal, rice and pasta), rounded to whole numbers.
 * Sources are standard composition tables + typical home-cooking assumptions, so they are
 * good estimates, not lab values — the UI says so.
 * Row: name | category | region | veg | state | kcal | P | C | F | fiber | servings | tags
 */
const ROWS = `
Roti (Whole Wheat Chapati)|breads|north|1|cooked|297|11|59|4|9|roti:40;piece:40;g:1|staple,wheat
Phulka (No Oil)|breads|north|1|cooked|278|11|58|1|9|phulka:35;g:1|staple,wheat,low-fat
Tandoori Roti|breads|north|1|cooked|310|10|60|4|8|roti:60;g:1|staple
Missi Roti|breads|north|1|cooked|320|12|52|8|9|roti:55;g:1|besan
Bajra Roti|breads|west|1|cooked|330|11|61|5|11|roti:50;g:1|millet,gluten-free
Jowar Roti (Bhakri)|breads|west|1|cooked|315|10|63|3|10|roti:50;g:1|millet,gluten-free
Ragi Roti|breads|south|1|cooked|310|8|64|3|11|roti:50;g:1|millet,calcium
Makki Roti|breads|north|1|cooked|340|8|62|8|7|roti:60;g:1|maize
Paratha (Plain, Ghee)|breads|north|1|cooked|360|8|46|16|6|paratha:60;g:1|high-fat
Aloo Paratha|breads|north|1|cooked|280|6|38|11|4|paratha:100;g:1|stuffed
Paneer Paratha|breads|north|1|cooked|310|11|32|15|3|paratha:100;g:1|stuffed,protein
Gobi Paratha|breads|north|1|cooked|255|6|36|9|5|paratha:100;g:1|stuffed
Naan|breads|north|1|cooked|310|9|50|8|2|naan:90;g:1|maida
Butter Naan|breads|north|1|cooked|350|8|48|14|2|naan:95;g:1|maida,high-fat
Kulcha|breads|north|1|cooked|300|8|52|6|2|kulcha:80;g:1|maida
Puri|breads|north|1|cooked|420|8|48|21|5|puri:25;g:1|fried
Bhatura|breads|north|1|cooked|400|8|50|19|2|bhatura:80;g:1|fried,maida
Thepla|breads|west|1|cooked|340|9|48|12|7|thepla:45;g:1|methi
Appam|south_indian|south|1|cooked|145|3|29|2|1|appam:70;g:1|rice,fermented
Idli|south_indian|south|1|cooked|130|4|26|1|1|idli:45;piece:45;g:1|fermented,low-fat
Rava Idli|south_indian|south|1|cooked|165|5|28|4|2|idli:55;g:1|semolina
Plain Dosa|south_indian|south|1|cooked|168|4|30|4|1|dosa:80;g:1|fermented
Masala Dosa|south_indian|south|1|cooked|180|4|28|6|2|dosa:150;g:1|stuffed
Rava Dosa|south_indian|south|1|cooked|210|4|30|8|1|dosa:110;g:1|semolina
Uttapam|south_indian|south|1|cooked|165|5|28|4|2|uttapam:120;g:1|fermented
Medu Vada|south_indian|south|1|cooked|290|7|30|16|4|vada:45;g:1|fried,urad
Upma|breakfast|south|1|cooked|155|4|24|5|2|bowl:180;g:1|semolina
Poha|breakfast|west|1|cooked|150|3|26|4|2|bowl:170;plate:200;g:1|flattened-rice
Sabudana Khichdi|breakfast|west|1|cooked|230|3|36|9|1|bowl:180;g:1|fasting
Dhokla|snacks|west|1|cooked|160|6|24|4|3|piece:40;plate:120;g:1|fermented,besan
Khaman Dhokla|snacks|west|1|cooked|170|7|22|6|3|piece:40;g:1|besan
Handvo|snacks|west|1|cooked|210|7|28|8|4|slice:80;g:1|lentil
Thalipeeth|breakfast|west|1|cooked|280|9|45|8|8|piece:70;g:1|multigrain
Pesarattu|south_indian|south|1|cooked|175|9|26|4|5|dosa:90;g:1|moong,protein
Cooked White Rice|grains|all|1|cooked|130|2.7|28|0.3|0.4|bowl:150;katori:120;cup:158;g:1|staple
Raw White Rice|grains|all|1|raw|360|7|79|0.6|1|cup:185;g:1|staple,uncooked
Cooked Brown Rice|grains|all|1|cooked|123|2.7|26|1|1.8|bowl:150;katori:120;g:1|fiber
Jeera Rice|rice_dishes|north|1|cooked|170|3|30|4|1|bowl:180;g:1|
Veg Pulao|rice_dishes|north|1|cooked|165|4|28|4|2|bowl:200;plate:250;g:1|
Veg Biryani|rice_dishes|all|1|cooked|180|4|29|5|2|plate:250;bowl:200;g:1|
Chicken Biryani|rice_dishes|all|0|cooked|200|10|24|7|1|plate:300;bowl:250;g:1|nonveg
Mutton Biryani|rice_dishes|all|0|cooked|225|11|24|9|1|plate:300;g:1|nonveg
Curd Rice|rice_dishes|south|1|cooked|130|4|21|3|1|bowl:200;g:1|probiotic
Lemon Rice|rice_dishes|south|1|cooked|165|3|29|4|1|bowl:180;g:1|
Tamarind Rice|rice_dishes|south|1|cooked|180|3|30|5|2|bowl:180;g:1|
Khichdi (Moong Dal)|rice_dishes|all|1|cooked|120|5|20|2|2|bowl:200;katori:150;g:1|comfort,easy-digest
Fried Rice (Veg)|rice_dishes|all|1|cooked|170|4|27|5|2|plate:250;g:1|
Quinoa Cooked|grains|all|1|cooked|120|4.4|21|1.9|2.8|bowl:150;g:1|complete-protein
Oats (Dry Rolled)|grains|all|1|raw|389|17|66|7|10|cup:80;scoop:40;g:1|fiber,beta-glucan
Oats Porridge (Water)|breakfast|all|1|cooked|71|2.5|12|1.4|1.7|bowl:250;g:1|fiber
Daliya (Broken Wheat, Cooked)|grains|north|1|cooked|110|4|22|0.6|3|bowl:200;g:1|fiber
Whole Wheat Flour (Atta)|grains|all|1|raw|340|12|69|2|11|cup:120;g:1|staple
Besan (Gram Flour)|grains|all|1|raw|387|22|58|7|11|cup:92;g:1|protein
Suji (Semolina)|grains|all|1|raw|360|12|73|1|4|cup:167;g:1|
Poha (Dry Flattened Rice)|grains|all|1|raw|346|7|77|1|2|cup:110;g:1|
Toor Dal Cooked|dal_legumes|all|1|cooked|121|7|18|3|4|katori:150;bowl:200;g:1|dal,protein
Toor Dal Raw|dal_legumes|all|1|raw|335|22|58|1.5|15|cup:200;g:1|dal,uncooked
Moong Dal Cooked|dal_legumes|all|1|cooked|105|7|15|2|4|katori:150;bowl:200;g:1|dal,protein
Moong Dal Raw|dal_legumes|all|1|raw|347|24|59|1.2|16|cup:200;g:1|dal,uncooked
Masoor Dal Cooked|dal_legumes|all|1|cooked|116|8|17|2.5|5|katori:150;bowl:200;g:1|dal,protein
Chana Dal Cooked|dal_legumes|all|1|cooked|135|8|20|3|6|katori:150;g:1|dal
Urad Dal Cooked|dal_legumes|all|1|cooked|130|8|19|3|5|katori:150;g:1|dal
Dal Tadka|dal_legumes|north|1|cooked|130|6|16|5|4|katori:150;bowl:200;g:1|dal
Dal Makhani|dal_legumes|north|1|cooked|175|7|18|9|6|katori:150;bowl:200;g:1|creamy,high-fat
Dal Fry|dal_legumes|north|1|cooked|140|6|17|5|4|katori:150;g:1|dal
Sambar|dal_legumes|south|1|cooked|85|4|12|2.5|3|katori:150;bowl:200;g:1|dal,veg
Rasam|dal_legumes|south|1|cooked|45|2|7|1|1|katori:150;bowl:200;g:1|light
Rajma Curry|dal_legumes|north|1|cooked|140|7|20|4|7|katori:150;bowl:200;g:1|kidney-beans,fiber
Chole (Chana Masala)|dal_legumes|north|1|cooked|155|8|21|5|8|katori:150;bowl:200;g:1|chickpea,fiber
Kala Chana Cooked|dal_legumes|all|1|cooked|160|9|27|3|9|katori:150;g:1|fiber
White Chana Boiled|dal_legumes|all|1|cooked|164|9|27|2.6|8|katori:150;cup:164;g:1|fiber
Sprouted Moong|dal_legumes|all|1|raw|30|3|6|0.2|1.8|bowl:100;katori:80;g:1|sprouts,low-cal
Lobia (Black Eyed Peas) Cooked|dal_legumes|all|1|cooked|127|8|21|0.5|6|katori:150;g:1|fiber
Soya Chunks Cooked|dal_legumes|all|1|cooked|140|17|9|2|5|katori:120;bowl:150;g:1|high-protein
Soya Chunks Dry|dal_legumes|all|1|raw|345|52|33|0.5|13|cup:60;g:1|high-protein
Tofu|dal_legumes|all|1|as_is|144|15|3|9|2|block:100;slice:30;g:1|vegan-protein
Paneer (Full Fat)|dairy|all|1|as_is|265|18|6|20|0|cube:15;serving:100;g:1|protein
Paneer (Low Fat)|dairy|all|1|as_is|180|22|5|8|0|serving:100;g:1|high-protein
Palak Paneer|curry_veg|north|1|cooked|150|8|7|10|3|katori:150;bowl:200;g:1|protein
Paneer Butter Masala|curry_veg|north|1|cooked|230|9|10|18|2|katori:150;g:1|high-fat
Shahi Paneer|curry_veg|north|1|cooked|245|9|11|19|2|katori:150;g:1|high-fat
Paneer Bhurji|curry_veg|north|1|cooked|200|15|6|14|2|katori:150;g:1|protein
Matar Paneer|curry_veg|north|1|cooked|170|9|11|11|3|katori:150;g:1|protein
Aloo Gobi|sabzi|north|1|cooked|105|3|14|5|3|katori:150;bowl:200;g:1|
Aloo Matar|sabzi|north|1|cooked|110|4|16|4|4|katori:150;g:1|
Aloo Jeera|sabzi|north|1|cooked|120|2|18|5|2|katori:150;g:1|
Bhindi Masala|sabzi|all|1|cooked|95|2|10|6|4|katori:150;g:1|okra
Baingan Bharta|sabzi|north|1|cooked|90|2|9|6|4|katori:150;g:1|
Lauki Sabzi|sabzi|north|1|cooked|55|1|7|3|2|katori:150;g:1|low-cal
Tinda Sabzi|sabzi|north|1|cooked|60|1.5|7|3|2|katori:150;g:1|low-cal
Cabbage Sabzi|sabzi|all|1|cooked|70|2|8|4|3|katori:150;g:1|low-cal
Mixed Veg Sabzi|sabzi|all|1|cooked|95|3|11|5|4|katori:150;bowl:200;g:1|
Palak Sabzi|sabzi|all|1|cooked|80|3|6|5|3|katori:150;g:1|iron
Methi Sabzi|sabzi|north|1|cooked|85|4|7|5|4|katori:150;g:1|
Sarson Ka Saag|sabzi|north|1|cooked|110|4|8|7|4|katori:150;g:1|
Karela Sabzi|sabzi|all|1|cooked|100|2|9|6|3|katori:150;g:1|bitter-gourd
Tori/Turai Sabzi|sabzi|all|1|cooked|60|1.5|7|3|2|katori:150;g:1|low-cal
Beans Poriyal|sabzi|south|1|cooked|85|3|10|4|4|katori:150;g:1|
Cabbage Poriyal|sabzi|south|1|cooked|75|2|9|4|3|katori:150;g:1|
Avial|sabzi|south|1|cooked|120|3|11|7|3|katori:150;g:1|coconut
Kadhi|curry_veg|north|1|cooked|95|4|8|5|1|katori:150;bowl:200;g:1|curd,besan
Malai Kofta|curry_veg|north|1|cooked|250|7|15|18|3|katori:150;g:1|high-fat
Veg Kolhapuri|curry_veg|west|1|cooked|140|4|12|9|4|katori:150;g:1|spicy
Mushroom Masala|curry_veg|all|1|cooked|110|4|8|7|2|katori:150;g:1|
Egg Curry|curry_nonveg|all|0|cooked|160|9|6|11|1|katori:150;bowl:200;g:1|nonveg
Chicken Curry (Home Style)|curry_nonveg|all|0|cooked|165|17|5|9|1|katori:150;bowl:200;g:1|nonveg,protein
Butter Chicken|curry_nonveg|north|0|cooked|230|14|8|16|1|katori:150;g:1|high-fat
Chicken Tikka (Grilled)|meat_fish_eggs|north|0|cooked|195|28|4|8|0|piece:40;serving:150;g:1|high-protein
Tandoori Chicken|meat_fish_eggs|north|0|cooked|180|27|2|7|0|piece:120;serving:200;g:1|high-protein
Chicken Breast Grilled|meat_fish_eggs|all|0|cooked|165|31|0|3.6|0|piece:120;serving:100;g:1|lean-protein
Chicken Thigh Cooked|meat_fish_eggs|all|0|cooked|209|26|0|11|0|piece:90;g:1|protein
Chicken Keema|curry_nonveg|all|0|cooked|200|20|4|12|1|katori:150;g:1|protein
Mutton Curry|curry_nonveg|all|0|cooked|235|20|4|16|1|katori:150;g:1|red-meat
Fish Curry|curry_nonveg|south|0|cooked|140|16|5|6|1|katori:150;g:1|protein
Rohu Fish Cooked|meat_fish_eggs|east|0|cooked|140|20|0|6|0|piece:100;g:1|protein
Pomfret Fried|meat_fish_eggs|west|0|cooked|205|21|3|12|0|piece:120;g:1|
Prawns Cooked|meat_fish_eggs|all|0|cooked|99|24|0.2|0.3|0|serving:100;g:1|lean-protein
Salmon Cooked|meat_fish_eggs|all|0|cooked|206|22|0|13|0|fillet:120;g:1|omega-3
Tuna Canned in Water|meat_fish_eggs|all|0|as_is|116|26|0|1|0|can:100;g:1|lean-protein
Boiled Egg (Whole)|meat_fish_eggs|all|0|cooked|155|13|1.1|11|0|egg:50;g:1|protein
Egg White Boiled|meat_fish_eggs|all|0|cooked|52|11|0.7|0.2|0|white:33;g:1|lean-protein
Egg Bhurji|meat_fish_eggs|all|0|cooked|180|12|3|13|0|serving:150;g:1|protein
Omelette (2 Egg)|meat_fish_eggs|all|0|cooked|180|12|2|14|0|omelette:120;g:1|protein
Milk Full Fat|dairy|all|1|as_is|62|3.2|4.8|3.4|0|glass:250;cup:200;ml:1|calcium
Milk Toned|dairy|all|1|as_is|50|3.2|4.9|1.9|0|glass:250;cup:200;ml:1|
Milk Skimmed|dairy|all|1|as_is|35|3.4|5|0.1|0|glass:250;ml:1|low-fat
Curd (Dahi, Full Fat)|dairy|all|1|as_is|60|3.5|4.7|3.3|0|katori:150;bowl:200;g:1|probiotic
Curd (Low Fat)|dairy|all|1|as_is|45|4|5|1|0|katori:150;g:1|probiotic
Greek Yogurt Plain|dairy|all|1|as_is|59|10|3.6|0.4|0|cup:170;g:1|high-protein
Buttermilk (Chaas)|beverages|all|1|as_is|30|1.5|3|1|0|glass:250;ml:1|
Lassi Sweet|beverages|north|1|as_is|95|3|15|3|0|glass:250;ml:1|sugar
Paneer Tikka|snacks|north|1|cooked|240|17|8|16|1|serving:150;piece:30;g:1|protein
Ghee|oils_fats|all|1|as_is|900|0|0|100|0|tsp:5;tbsp:14;g:1|fat
Butter|oils_fats|all|1|as_is|717|0.9|0.1|81|0|tsp:5;tbsp:14;g:1|fat
Mustard Oil|oils_fats|all|1|as_is|884|0|0|100|0|tsp:5;tbsp:14;ml:1|fat
Refined Oil|oils_fats|all|1|as_is|884|0|0|100|0|tsp:5;tbsp:14;ml:1|fat
Coconut Oil|oils_fats|south|1|as_is|862|0|0|100|0|tsp:5;tbsp:14;ml:1|fat
Olive Oil|oils_fats|all|1|as_is|884|0|0|100|0|tsp:5;tbsp:14;ml:1|fat
Cheese Slice (Processed)|dairy|all|1|as_is|310|18|4|25|0|slice:20;g:1|
Mozzarella Cheese|dairy|all|1|as_is|280|22|2|21|0|serving:30;g:1|protein
Khoya (Mawa)|dairy|all|1|as_is|420|15|25|30|0|serving:50;g:1|
Cream (Malai)|dairy|all|1|as_is|340|2.5|3|36|0|tbsp:15;g:1|fat
Almonds|nuts_seeds|all|1|as_is|579|21|22|50|12|piece:1.2;handful:28;g:1|healthy-fat
Cashews|nuts_seeds|all|1|as_is|553|18|30|44|3|handful:28;g:1|
Walnuts|nuts_seeds|all|1|as_is|654|15|14|65|7|handful:28;half:3;g:1|omega-3
Peanuts Roasted|nuts_seeds|all|1|as_is|567|26|16|49|9|handful:28;katori:60;g:1|protein
Pistachios|nuts_seeds|all|1|as_is|560|20|28|45|10|handful:28;g:1|
Raisins (Kishmish)|nuts_seeds|all|1|as_is|299|3|79|0.5|4|handful:28;g:1|sugar
Dates (Khajur)|fruits|all|1|as_is|282|2.5|75|0.4|8|date:8;g:1|natural-sugar
Chia Seeds|nuts_seeds|all|1|as_is|486|17|42|31|34|tbsp:12;g:1|fiber,omega-3
Flax Seeds|nuts_seeds|all|1|as_is|534|18|29|42|27|tbsp:10;g:1|fiber
Pumpkin Seeds|nuts_seeds|all|1|as_is|559|30|11|49|6|tbsp:10;handful:28;g:1|protein
Sunflower Seeds|nuts_seeds|all|1|as_is|584|21|20|51|9|tbsp:10;g:1|
Peanut Butter|nuts_seeds|all|1|as_is|588|25|20|50|6|tbsp:16;g:1|protein,fat
Coconut Fresh|nuts_seeds|south|1|as_is|354|3.3|15|33|9|serving:50;g:1|fat
Banana|fruits|all|1|as_is|89|1.1|23|0.3|2.6|banana:120;small:90;large:150;g:1|potassium
Apple|fruits|all|1|as_is|52|0.3|14|0.2|2.4|apple:180;g:1|fiber
Mango|fruits|all|1|as_is|60|0.8|15|0.4|1.6|mango:200;cup:165;g:1|seasonal
Papaya|fruits|all|1|as_is|43|0.5|11|0.3|1.7|bowl:150;g:1|digestion
Guava|fruits|all|1|as_is|68|2.6|14|1|5.4|guava:120;g:1|high-fiber
Orange|fruits|all|1|as_is|47|0.9|12|0.1|2.4|orange:130;g:1|vitamin-c
Watermelon|fruits|all|1|as_is|30|0.6|8|0.2|0.4|bowl:150;slice:280;g:1|hydrating
Grapes|fruits|all|1|as_is|69|0.7|18|0.2|0.9|bowl:100;g:1|
Pomegranate|fruits|all|1|as_is|83|1.7|19|1.2|4|bowl:100;g:1|fiber
Pineapple|fruits|all|1|as_is|50|0.5|13|0.1|1.4|bowl:150;g:1|
Chikoo (Sapota)|fruits|all|1|as_is|83|0.4|20|1.1|5.3|fruit:100;g:1|
Custard Apple|fruits|all|1|as_is|94|2.1|24|0.6|4.4|fruit:150;g:1|
Strawberry|fruits|all|1|as_is|32|0.7|8|0.3|2|bowl:100;g:1|
Blueberry|fruits|all|1|as_is|57|0.7|14|0.3|2.4|bowl:100;g:1|
Kiwi|fruits|all|1|as_is|61|1.1|15|0.5|3|fruit:75;g:1|
Pear|fruits|all|1|as_is|57|0.4|15|0.1|3.1|fruit:170;g:1|
Musk Melon|fruits|all|1|as_is|34|0.8|8|0.2|0.9|bowl:150;g:1|
Amla|fruits|all|1|as_is|44|0.9|10|0.6|4.3|piece:35;g:1|vitamin-c
Potato Boiled|vegetables|all|1|cooked|87|1.9|20|0.1|1.8|medium:150;g:1|starch
Sweet Potato Boiled|vegetables|all|1|cooked|86|1.6|20|0.1|3|medium:130;g:1|fiber
Tomato|vegetables|all|1|raw|18|0.9|3.9|0.2|1.2|medium:100;g:1|
Onion|vegetables|all|1|raw|40|1.1|9|0.1|1.7|medium:110;g:1|
Cucumber|vegetables|all|1|raw|16|0.7|3.6|0.1|0.5|medium:200;bowl:100;g:1|hydrating
Carrot|vegetables|all|1|raw|41|0.9|10|0.2|2.8|medium:60;bowl:100;g:1|
Spinach Raw|vegetables|all|1|raw|23|2.9|3.6|0.4|2.2|bowl:100;g:1|iron
Broccoli Cooked|vegetables|all|1|cooked|35|2.4|7|0.4|3.3|bowl:150;g:1|fiber
Cauliflower Raw|vegetables|all|1|raw|25|1.9|5|0.3|2|bowl:100;g:1|
Cabbage Raw|vegetables|all|1|raw|25|1.3|6|0.1|2.5|bowl:100;g:1|
Capsicum|vegetables|all|1|raw|31|1|6|0.3|2.1|medium:120;g:1|
Beetroot Boiled|vegetables|all|1|cooked|44|1.7|10|0.2|2|bowl:100;g:1|
Green Peas Boiled|vegetables|all|1|cooked|84|5.4|16|0.2|5.5|katori:100;g:1|protein,fiber
Bottle Gourd Raw|vegetables|all|1|raw|14|0.6|3.4|0.02|0.5|bowl:100;g:1|low-cal
Mushroom Raw|vegetables|all|1|raw|22|3.1|3.3|0.3|1|bowl:100;g:1|
Corn Boiled|vegetables|all|1|cooked|96|3.4|21|1.5|2.4|cob:90;bowl:150;g:1|
Salad (Kachumber)|vegetables|all|1|raw|25|1|5|0.2|1.5|bowl:150;plate:200;g:1|low-cal
Samosa|snacks|north|1|cooked|308|5|32|18|3|samosa:60;g:1|fried,street
Kachori|snacks|north|1|cooked|360|7|38|20|4|kachori:55;g:1|fried
Pakora (Onion)|snacks|all|1|cooked|315|7|30|19|4|piece:25;plate:100;g:1|fried
Vada Pav|street_food|west|1|cooked|290|7|40|11|3|piece:150;g:1|street
Pav Bhaji|street_food|west|1|cooked|165|4|20|8|4|plate:300;g:1|street
Pani Puri (6 pcs)|street_food|all|1|cooked|110|3|18|3|2|plate:120;puri:20;g:1|street
Bhel Puri|street_food|west|1|cooked|230|6|38|6|4|plate:120;g:1|street
Sev Puri|street_food|west|1|cooked|280|6|38|11|3|plate:120;g:1|street
Dahi Puri|street_food|west|1|cooked|240|6|33|9|3|plate:130;g:1|street
Aloo Tikki|street_food|north|1|cooked|180|3|25|8|3|piece:80;g:1|street
Chole Bhature|street_food|north|1|cooked|280|8|35|12|5|plate:350;g:1|street,heavy
Momos (Veg, Steamed)|snacks|east|1|cooked|170|5|28|4|2|piece:30;plate:180;g:1|steamed
Momos (Chicken, Steamed)|snacks|east|0|cooked|190|10|24|6|1|piece:32;plate:190;g:1|protein
Spring Roll (Veg)|snacks|all|1|cooked|280|5|33|14|2|roll:60;g:1|fried
Bread Pakora|snacks|north|1|cooked|320|7|35|17|3|piece:80;g:1|fried
Maggi Noodles (Cooked)|packaged|all|1|cooked|145|3.5|20|6|1|pack:160;bowl:200;g:1|packaged
Pasta Cooked|grains|all|1|cooked|131|5|25|1.1|1.8|bowl:200;g:1|
White Bread Slice|breads|all|1|as_is|265|9|49|3.2|2.7|slice:28;g:1|refined
Brown Bread Slice|breads|all|1|as_is|250|10|45|3|6|slice:30;g:1|fiber
Multigrain Bread|breads|all|1|as_is|255|11|43|4|7|slice:35;g:1|fiber
Rusk|snacks|all|1|as_is|407|9|76|8|3|piece:12;g:1|
Marie Biscuit|packaged|all|1|as_is|440|7|76|12|2|biscuit:5;g:1|packaged
Digestive Biscuit|packaged|all|1|as_is|478|7|63|21|4|biscuit:15;g:1|packaged
Khakhra|snacks|west|1|as_is|400|12|66|9|9|piece:15;g:1|baked
Chivda/Namkeen Mix|snacks|all|1|as_is|500|11|55|26|6|katori:40;handful:25;g:1|fried
Bhujia|snacks|north|1|as_is|540|13|48|33|6|katori:40;g:1|fried
Popcorn (Plain Air-Popped)|snacks|all|1|cooked|387|13|78|4.5|15|bowl:25;g:1|fiber
Potato Chips|packaged|all|1|as_is|536|7|53|35|4|pack:30;g:1|fried
Roasted Chana|snacks|all|1|as_is|390|22|58|5|18|katori:40;handful:25;g:1|protein,fiber
Makhana Roasted|snacks|east|1|as_is|350|9.7|77|0.1|14|bowl:25;g:1|fiber,low-fat
Protein Bar (Typical)|protein_supplements|all|1|as_is|380|30|38|10|6|bar:60;g:1|supplement
Whey Protein Powder|protein_supplements|all|1|as_is|400|78|8|6|1|scoop:30;g:1|supplement
Plant Protein Powder|protein_supplements|all|1|as_is|380|70|12|6|6|scoop:30;g:1|supplement,vegan
Mass Gainer Powder|protein_supplements|all|1|as_is|380|20|68|3|2|scoop:75;g:1|supplement
Gulab Jamun|sweets|north|1|cooked|310|4|48|12|0|piece:40;g:1|sugar
Rasgulla|sweets|east|1|cooked|186|4|38|2|0|piece:50;g:1|sugar
Jalebi|sweets|north|1|cooked|380|3|65|13|0|piece:30;g:1|sugar,fried
Ladoo (Besan)|sweets|all|1|cooked|420|8|50|21|3|piece:40;g:1|sugar
Barfi|sweets|all|1|cooked|400|8|45|21|1|piece:30;g:1|sugar
Halwa (Suji)|sweets|all|1|cooked|360|5|50|16|1|katori:100;g:1|sugar
Gajar Halwa|sweets|north|1|cooked|280|4|38|13|2|katori:100;g:1|sugar
Kheer (Rice)|sweets|all|1|cooked|145|4|22|5|0.5|katori:150;g:1|sugar
Shrikhand|sweets|west|1|as_is|250|6|35|9|0|katori:100;g:1|sugar
Ice Cream Vanilla|sweets|all|1|as_is|207|3.5|24|11|0.7|scoop:60;cup:100;g:1|sugar
Dark Chocolate 70%|sweets|all|1|as_is|598|7.8|46|43|11|square:10;bar:50;g:1|
Milk Chocolate|sweets|all|1|as_is|535|7.6|59|30|3.4|bar:40;g:1|sugar
Sugar (White)|condiments|all|1|as_is|387|0|100|0|0|tsp:5;tbsp:12;g:1|sugar
Jaggery (Gud)|condiments|all|1|as_is|383|0.4|98|0.1|0|piece:10;tsp:6;g:1|sugar
Honey|condiments|all|1|as_is|304|0.3|82|0|0.2|tsp:7;tbsp:21;g:1|sugar
Tea with Milk & Sugar|beverages|all|1|as_is|45|1.3|6|1.5|0|cup:150;glass:200;ml:1|caffeine
Black Tea (No Sugar)|beverages|all|1|as_is|1|0|0.2|0|0|cup:150;ml:1|zero-cal
Green Tea|beverages|all|1|as_is|1|0|0.2|0|0|cup:200;ml:1|zero-cal
Coffee with Milk & Sugar|beverages|all|1|as_is|55|1.6|7|2|0|cup:150;ml:1|caffeine
Black Coffee|beverages|all|1|as_is|2|0.3|0|0|0|cup:200;ml:1|zero-cal
Filter Coffee|beverages|south|1|as_is|60|2|8|2.2|0|tumbler:150;ml:1|
Nimbu Pani (Sweet)|beverages|all|1|as_is|35|0|9|0|0|glass:250;ml:1|sugar
Coconut Water|beverages|all|1|as_is|19|0.7|3.7|0.2|1.1|glass:250;ml:1|electrolytes
Orange Juice Fresh|beverages|all|1|as_is|45|0.7|10|0.2|0.2|glass:250;ml:1|
Sugarcane Juice|beverages|all|1|as_is|65|0.2|16|0.1|0|glass:250;ml:1|sugar
Cola Soft Drink|beverages|all|1|as_is|42|0|10.6|0|0|can:330;glass:250;ml:1|sugar
Diet Soft Drink|beverages|all|1|as_is|1|0|0.1|0|0|can:330;ml:1|zero-cal
Beer|beverages|all|1|as_is|43|0.5|3.6|0|0|bottle:330;pint:500;ml:1|alcohol
Whisky (40%)|beverages|all|1|as_is|250|0|0|0|0|peg:30;large:60;ml:1|alcohol
Red Wine|beverages|all|1|as_is|85|0.1|2.6|0|0|glass:150;ml:1|alcohol
Protein Shake (Whey + Milk)|beverages|all|1|as_is|75|8|5|2|0|glass:300;ml:1|protein
Water|beverages|all|1|as_is|0|0|0|0|0|glass:250;bottle:500;ml:1|hydration
Tomato Ketchup|condiments|all|1|as_is|101|1.2|25|0.1|0.3|tbsp:17;tsp:6;g:1|sugar
Mayonnaise|condiments|all|1|as_is|680|1|1|75|0|tbsp:14;g:1|fat
Green Chutney|condiments|all|1|as_is|60|3|7|2|3|tbsp:15;katori:40;g:1|
Coconut Chutney|condiments|south|1|as_is|180|3|8|15|4|katori:40;tbsp:15;g:1|fat
Tamarind Chutney|condiments|all|1|as_is|180|0.5|44|0.2|1|tbsp:15;g:1|sugar
Pickle (Mango Achar)|condiments|all|1|as_is|180|1|10|15|2|tsp:8;g:1|sodium,fat
Papad Roasted|condiments|all|1|cooked|340|22|50|3|10|piece:10;g:1|protein
Sambar Powder|condiments|south|1|as_is|340|15|45|10|20|tsp:4;g:1|
Salt|condiments|all|1|as_is|0|0|0|0|0|tsp:6;g:1|sodium
`.trim();

export type SeedFood = {
  name: string;
  searchName: string;
  category: string;
  region: string;
  veg: boolean;
  state: string;
  per100: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
  servings: { label: string; grams: number }[];
  defaultServing: number;
  tags: string[];
  source: string;
  verified: boolean;
};

export const SEED_FOODS: SeedFood[] = ROWS.split("\n").map((line) => {
  const [name, category, region, veg, state, kcal, p, c, f, fib, servings, tags] = line.split("|");
  return {
    name,
    searchName: `${name} ${category} ${tags ?? ""}`.toLowerCase(),
    category,
    region,
    veg: veg === "1",
    state,
    per100: {
      kcal: Number(kcal),
      protein: Number(p),
      carbs: Number(c),
      fat: Number(f),
      fiber: Number(fib),
    },
    servings: servings.split(";").map((s) => {
      const [label, grams] = s.split(":");
      return { label, grams: Number(grams) };
    }),
    defaultServing: 0,
    tags: tags ? tags.split(",").filter(Boolean) : [],
    source: "library",
    verified: true,
  };
});

export const FOOD_CATEGORIES = [
  "breads",
  "south_indian",
  "breakfast",
  "grains",
  "rice_dishes",
  "dal_legumes",
  "sabzi",
  "curry_veg",
  "curry_nonveg",
  "meat_fish_eggs",
  "dairy",
  "fruits",
  "vegetables",
  "nuts_seeds",
  "snacks",
  "street_food",
  "sweets",
  "beverages",
  "protein_supplements",
  "packaged",
  "condiments",
  "oils_fats",
];
