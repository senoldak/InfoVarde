// src/server/seed.js
import { getDb, initDatabase } from './db.js';

export function seedDemoData(db = null) {
  const targetDb = db || getDb();
  initDatabase(targetDb);

  // Clear existing demo data
  targetDb.exec(`
    DELETE FROM channels WHERE code IN ('MYTI-01', 'OSLO-01');
  `);

  const insertChannel = targetDb.prepare(`
    INSERT INTO channels (code, name, location_name, latitude, longitude, slide_interval_sec, theme_color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAnn = targetDb.prepare(`
    INSERT INTO announcements (
      channel_id, category, priority, content_type, image_url, audio_url,
      event_date, event_time, event_location, slide_duration, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTrans = targetDb.prepare(`
    INSERT INTO announcement_translations (
      announcement_id, lang_code, title, content, audio_url, is_rtl
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Channel 1: Mytilene / Lesvos Welcome Center
  const mytiRes = insertChannel.run(
    'MYTI-01',
    'Mytilene Welcome Hub — Hovedsal',
    'Mytilene, Lesvos, Hellas',
    39.1044,
    26.5547,
    10,
    '#F97316'
  );
  const mytiId = mytiRes.lastInsertRowid;

  // Channel 2: Oslo Mottak & Integrasjonssenter
  const osloRes = insertChannel.run(
    'OSLO-01',
    'Oslo Mottakssenter — Fellesareal',
    'Oslo, Norge',
    59.9139,
    10.7522,
    12,
    '#06B6D4'
  );
  const osloId = osloRes.lastInsertRowid;

  // Announcement 1 (MYTI-01): Health Clinic
  const ann1 = insertAnn.run(
    mytiId,
    'health',
    'normal',
    'event',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    null,
    '2026-10-16',
    '09:00 - 13:00',
    'Klinikktelt B (Clinic Tent B)',
    12,
    1
  );
  const ann1Id = ann1.lastInsertRowid;

  insertTrans.run(ann1Id, 'no', 'Gratis legeundersøkelse og helsesjekk', 'Leger Uten Grenser og Røde Kors tilbyr gratis helsekontroll for barn og voksne i Klinikktelt B. Tolk er til stede.', null, 0);
  insertTrans.run(ann1Id, 'en', 'Free Medical Consultations & Health Check', 'Doctors Without Borders and Red Cross provide free medical exams for children and adults at Clinic Tent B. Translators available.', null, 0);
  insertTrans.run(ann1Id, 'uk', 'Безкоштовний медичний огляд для всіх', 'Лікарі без кордонів та Червоний Хрест проводять безкоштовні медичні огляди у наметі B. Працюють перекладачі.', null, 0);
  insertTrans.run(ann1Id, 'ar', 'فحوصات طبية مجانية للجميع', 'أطباء بلا حدود والهلال الأحمر يقدمون رعاية طبية مجانية للأطفال والبالغين في خيمة العيادة ب. يتوفر مترجمون.', null, 1);
  insertTrans.run(ann1Id, 'fa', 'معاینات صحی و طبی رایگان برای همه', 'داکتران بدون مرز خدمات صحی رایگان برای اطفال و بزرگسالان در خیمه B ارائه میدهند. ترجمان حضور دارد.', null, 1);
  insertTrans.run(ann1Id, 'tr', 'Ücretsiz Sağlık Taraması ve Doktor Muayenesi', 'Sınır Tanımayan Doktorlar ve Kızılay, Klinik Çadırı B\'de çocuklar ve yetişkinler için ücretsiz sağlık kontrolü sunmaktadır.', null, 0);
  insertTrans.run(ann1Id, 'el', 'Δωρεάν Ιατρικός Έλεγχος για Όλους', 'Οι Γιατροί Χωρίς Σύνορα και ο Ερυθρός Σταυρός παρέχουν δωρεάν εξετάσεις στη Σκηνή Κλινικής Β.', null, 0);

  // Announcement 2 (MYTI-01): Legal Aid Office
  const ann2 = insertAnn.run(
    mytiId,
    'legal',
    'normal',
    'event',
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
    null,
    '2026-10-17',
    '14:00 - 17:30',
    'Kontor 4 (Juridisk bistand)',
    10,
    1
  );
  const ann2Id = ann2.lastInsertRowid;

  insertTrans.run(ann2Id, 'no', 'Juridisk rådgivning om asylprosessen', 'Advokater gir gratis individuell veiledning om asylintervjuer, familieforening og dine rettigheter. Bestill tid i resepsjonen.', null, 0);
  insertTrans.run(ann2Id, 'en', 'Legal Advice on Asylum Process', 'Legal counselors provide free individual guidance regarding asylum interviews, family reunification and your rights. Register at desk.', null, 0);
  insertTrans.run(ann2Id, 'uk', 'Юридичні консультації щодо притулку', 'Юристи надають безкоштовну правову допомогу щодо співбесід, возз’єднання сім’ї та ваших прав. Запис на рецепції.', null, 0);
  insertTrans.run(ann2Id, 'ar', 'استشارات قانونية مجانية حول اللجوء', 'يقدم المحامون إرشادات فردية مجانية حول مقابلات اللجوء ولم شمل الأسرة وحقوقك القانونية. سجل في الاستقبال.', null, 1);
  insertTrans.run(ann2Id, 'fa', 'مشاوره حقوقی رایگان پناهندگی', 'وکلا رهنمودهای رایگان در مورد مصاحبه‌های پناهندگی و حقوق قانونی شما ارائه میدهند. در بخش پذیرش ثبت نام کنید.', null, 1);
  insertTrans.run(ann2Id, 'tr', 'İltica Süreci ve Hukuki Danışmanlık', 'Avukatlar iltica mülakatları, aile birleşimi ve yasal haklarınız hakkında ücretsiz bireysel rehberlik sağlamaktadır.', null, 0);

  // Announcement 3 (OSLO-01): Winter Clothes Distribution
  const ann3 = insertAnn.run(
    osloId,
    'food',
    'normal',
    'event',
    'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&auto=format&fit=crop&q=80',
    null,
    '2026-10-18',
    '11:00 - 16:00',
    'Gymsalen (Sports Hall)',
    12,
    1
  );
  const ann3Id = ann3.lastInsertRowid;

  insertTrans.run(ann3Id, 'no', 'Utdeling av varme vinterklær og sko', 'Røde Kors deler ut varme vinterjakker, luer, hansker og vintersko til alle beboere i gymsalen. Ta med mottakskortet.', null, 0);
  insertTrans.run(ann3Id, 'en', 'Winter Jackets & Boots Distribution', 'Red Cross distributes warm winter coats, boots, hats and gloves in the sports hall. Please bring your reception center ID card.', null, 0);
  insertTrans.run(ann3Id, 'uk', 'Роздача теплого зимового одягу та взуття', 'Червоний Хрест роздає теплі зимові куртки, взуття та шапки у спортзалі. Візьміть картку центру.', null, 0);
  insertTrans.run(ann3Id, 'ar', 'توزيع ملابس وأحذية الشتاء الدافئة', 'الصليب الأحمر يوزع معاطف شتوية دافئة وأحذية وقفازات في القاعة الرياضية. يرجى إحضار بطاقة المركز.', null, 1);
  insertTrans.run(ann3Id, 'so', 'Qaybinta dharka jiilaalka iyo kabaha', 'Hay’adda Laanqayrta Cas waxay qolka jimicsiga ku qaybinaysaa jaakado diirran iyo kabaal jiilaal. Keen kaarkaaga.', null, 0);

  // Announcement 4 (OSLO-01): Norwegian Language Cafe
  const ann4 = insertAnn.run(
    osloId,
    'education',
    'normal',
    'event',
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
    null,
    'Hver tirsdag & torsdag',
    '17:00 - 18:30',
    'Kafeteriaen (Cafeteria)',
    10,
    1
  );
  const ann4Id = ann4.lastInsertRowid;

  insertTrans.run(ann4Id, 'no', 'Språkkafé: Lær norsk med frivillige', 'Øv på å snakke norsk i et uformelt og hyggelig miljø. Vi serverer kaffe, te og kjeks. Alle nivåer er velkomne!', null, 0);
  insertTrans.run(ann4Id, 'en', 'Language Café: Practice Norwegian', 'Practice conversational Norwegian in a relaxed and friendly setting with local volunteers. Coffee and tea provided. All levels welcome!', null, 0);
  insertTrans.run(ann4Id, 'uk', 'Мовне кафе: Практикуйте норвезьку', 'Практикуйте норвезьку розмовну мову з волонтерами у приємній атмосфері. Чай та кава додаються. Для всіх рівнів!', null, 0);
  insertTrans.run(ann4Id, 'ar', 'مقهى اللغة: تدرب على التحدث بالنرويجية', 'تدرب على اللغة النرويجية في أجواء ودية ومريحة مع المتطوعين. القهوة والشاي مجاناً. مرحباً بالجميع!', null, 1);

  console.log(`✅ Demo database seeded successfully: 2 channels, 4 multilingual announcements!`);
}

// Allow direct execution: node src/server/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDemoData();
}
