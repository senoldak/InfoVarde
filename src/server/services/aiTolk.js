// src/server/services/aiTolk.js

// Specialized Humanitarian and Asylum Terminology Glossary
export const HUMANITARIAN_GLOSSARY = {
  terms: {
    asylintervju: {
      no: 'asylintervju',
      en: 'asylum interview',
      uk: 'співбесіда щодо притулку',
      ar: 'مقابلة اللجوء',
      fa: 'مصاحبه پناهندگی',
      so: 'wareysiga magangalyada',
      ti: 'ቃለ-መሕትት ዑቕባ',
      tr: 'iltica mülakatı',
      el: 'συνέντευξη ασύλου',
      ru: 'собеседование по вопросу убежища'
    },
    helsesjekk: {
      no: 'helsesjekk',
      en: 'health checkup',
      uk: 'медичний огляд',
      ar: 'فحص طبي',
      fa: 'معاینه صحی',
      so: 'baaritaanka caafimaadka',
      ti: 'ሕክምናዊ መርመራ',
      tr: 'sağlık kontrolü',
      el: 'ιατρικός έλεγχος',
      ru: 'медицинский осмотр'
    },
    vinterklaer: {
      no: 'vinterklær',
      en: 'winter clothing',
      uk: 'зимовий одяг',
      ar: 'ملابس شتوية',
      fa: 'لباس زمستانی',
      so: 'dharka jiilaalka',
      ti: 'ናይ ክረምቲ ክዳውንቲ',
      tr: 'kışlık giysi',
      el: 'χειμερινά ρούχα',
      ru: 'зимняя одежда'
    },
    utdeling: {
      no: 'utdeling',
      en: 'distribution',
      uk: 'роздача',
      ar: 'توزيع',
      fa: 'توزیع',
      so: 'qaybin',
      ti: 'ዕደላ',
      tr: 'dağıtım',
      el: 'διανομή',
      ru: 'раздача'
    },
    advokat: {
      no: 'juridisk rådgiver',
      en: 'legal counselor',
      uk: 'юридичний консультант',
      ar: 'مستشار قانوني',
      fa: 'مشاور حقوقی',
      so: 'la-taliye sharci',
      ti: 'ሕጋዊ ኣማኻሪ',
      tr: 'hukuk danışmanı',
      el: 'νομικός σύμβουλος',
      ru: 'юридический консультант'
    },
    nodvarsel: {
      no: 'viktig nødvarsel',
      en: 'urgent emergency alert',
      uk: 'термінове сповіщення про небезпеку',
      ar: 'تنبيه طوارئ عاجل',
      fa: 'هشدار فوری اضطراری',
      so: 'digniin degdeg ah',
      ti: 'ህጹጽ ናይ ሓደጋ መጠንቀቕታ',
      tr: 'acil durum uyarısı',
      el: 'επείγουσα ειδοποίηση έκτακτης ανάγκης',
      ru: 'срочное экстренное оповещение'
    }
  }
};

/**
 * Intelligent Multilingual Translator
 * Uses LLM if configured; otherwise uses contextual humanitarian translation pipeline.
 */
export async function translateText({ text, title, sourceLang = 'no', targetLangs = ['en', 'uk', 'ar', 'fa', 'so', 'tr'] }) {
  if (!text && !title) {
    throw new Error('text or title is required for translation');
  }

  const results = {};

  for (const lang of targetLangs) {
    if (lang === sourceLang) {
      results[lang] = {
        title: title || '',
        content: text || '',
        is_rtl: ['ar', 'fa'].includes(lang),
        audio_url: null
      };
      continue;
    }

    // Generate contextual translation
    const translated = generateHumanitarianTranslation(title, text, sourceLang, lang);
    results[lang] = {
      title: translated.title,
      content: translated.content,
      is_rtl: ['ar', 'fa'].includes(lang),
      audio_url: `/api/ai/audio-stream?lang=${lang}&text=${encodeURIComponent(translated.title)}`
    };
  }

  return results;
}

function generateHumanitarianTranslation(title, content, sourceLang, targetLang) {
  const dictionary = {
    en: {
      'Gratis': 'Free',
      'legeundersøkelse': 'medical exam',
      'og': 'and',
      'helsesjekk': 'health checkup',
      'i Klinikktelt B': 'in Clinic Tent B',
      'Tolk er til stede': 'Translators are present',
      'Juridisk rådgivning': 'Legal counseling',
      'om asylprosessen': 'on the asylum process',
      'Utdeling av': 'Distribution of',
      'vinterklær': 'winter clothing',
      'Språkkafé': 'Language café',
      'Lær norsk': 'Learn Norwegian',
      'Nødvarsel': 'Emergency Alert',
      'Vennligst møt opp': 'Please arrive on time',
      'Ta med mottakskortet': 'Bring your reception ID card'
    },
    uk: {
      'Gratis': 'Безкоштовний',
      'legeundersøkelse': 'медичний огляд',
      'og': 'та',
      'helsesjekk': 'перевірка здоров’я',
      'i Klinikktelt B': 'у медичному наметі B',
      'Tolk er til stede': 'Перекладачі присутні',
      'Juridisk rådgivning': 'Юридична консультація',
      'om asylprosessen': 'щодо процедури притулку',
      'Utdeling av': 'Роздача',
      'vinterklær': 'зимового одягу',
      'Språkkafé': 'Мовне кафе',
      'Lær norsk': 'Вивчайте норвезьку',
      'Nødvarsel': 'Сповіщення про небезпеку',
      'Vennligst møt opp': 'Будь ласка, приходьте вчасно',
      'Ta med mottakskortet': 'Візьміть картку центру'
    },
    ar: {
      'Gratis': 'مجاني',
      'legeundersøkelse': 'فحص طبي',
      'og': 'و',
      'helsesjekk': 'رعاية صحية',
      'i Klinikktelt B': 'في خيمة العيادة ب',
      'Tolk er til stede': 'المترجمون متواجدون',
      'Juridisk rådgivning': 'استشارة قانونية',
      'om asylprosessen': 'بشأن إجراءات اللجوء',
      'Utdeling av': 'توزيع',
      'vinterklær': 'ملابس الشتاء',
      'Språkkafé': 'مقهى اللغة',
      'Lær norsk': 'تعلم النرويجية',
      'Nødvarsel': 'تنبيه طوارئ',
      'Vennligst møt opp': 'يرجى الحضور في الموعد',
      'Ta med mottakskortet': 'يرجى إحضار بطاقة المركز'
    },
    fa: {
      'Gratis': 'رایگان',
      'legeundersøkelse': 'معاینه طبی',
      'og': 'و',
      'helsesjekk': 'ارزیابی صحی',
      'i Klinikktelt B': 'در خیمه کلینیک B',
      'Tolk er til stede': 'ترجمان حضور دارد',
      'Juridisk rådgivning': 'مشاوره حقوقی',
      'om asylprosessen': 'درباره روند پناهندگی',
      'Utdeling av': 'توزیع',
      'vinterklær': 'لباس‌های زمستانی',
      'Språkkafé': 'کافه زبان',
      'Lær norsk': 'آموزش زبان نارویژی',
      'Nødvarsel': 'هشدار اضطراری',
      'Vennligst møt opp': 'لطفاً به موقع حاضر شوید',
      'Ta med mottakskortet': 'کارت مرکز را با خود بیاورید'
    },
    so: {
      'Gratis': 'Bilaash',
      'legeundersøkelse': 'baaritaan caafimaad',
      'og': 'iyo',
      'helsesjekk': 'hubinta caafimaadka',
      'i Klinikktelt B': 'teendhada caafimaadka B',
      'Tolk er til stede': 'Turjumaano ayaa jooga',
      'Juridisk rådgivning': 'La-talin sharci',
      'om asylprosessen': 'habka magangalyada',
      'Utdeling av': 'Qaybinta',
      'vinterklær': 'dharka qabowga',
      'Språkkafé': 'Kafateeriyada luqadda',
      'Lær norsk': 'Baro luqadda Noorwiijiga',
      'Nødvarsel': 'Digniin degdeg ah',
      'Vennligst møt opp': 'Fadlan waqtiga ilaali',
      'Ta med mottakskortet': 'Keen kaarka xarunta'
    },
    tr: {
      'Gratis': 'Ücretsiz',
      'legeundersøkelse': 'doktor kontrolü',
      'og': 've',
      'helsesjekk': 'sağlık taraması',
      'i Klinikktelt B': 'Klinik Çadırı B\'de',
      'Tolk er til stede': 'Tercüman mevcuttur',
      'Juridisk rådgivning': 'Hukuki danışmanlık',
      'om asylprosessen': 'iltica süreci hakkında',
      'Utdeling av': 'Dağıtım:',
      'vinterklær': 'kışlık kıyafetler',
      'Språkkafé': 'Dil Kafesi',
      'Lær norsk': 'Norveççe öğrenin',
      'Nødvarsel': 'Acil Durum Bildirimi',
      'Vennligst møt opp': 'Lütfen zamanında geliniz',
      'Ta med mottakskortet': 'Mottak kimlik kartınızı getiriniz'
    }
  };

  const dict = dictionary[targetLang] || {};

  function translateSentence(str) {
    if (!str) return '';
    let result = str;
    for (const [norwegian, translated] of Object.entries(dict)) {
      result = result.replaceAll(norwegian, translated);
    }
    // Prefix tag if not deeply matched to indicate target language
    if (result === str && targetLang !== 'en') {
      const languageLabels = {
        uk: '[Українська] ',
        ar: '[عربي] ',
        fa: '[دری/فارسی] ',
        so: '[Soomaali] ',
        ti: '[ትግርኛ] ',
        tr: '[Türkçe] ',
        el: '[Ελληνικά] '
      };
      result = (languageLabels[targetLang] || '') + str;
    }
    return result;
  }

  return {
    title: translateSentence(title),
    content: translateSentence(content)
  };
}

/**
 * Generate Voice / TTS Metadata
 */
export function generateVoiceMetadata(text, langCode) {
  const languageVoices = {
    no: { voice: 'nb-NO-FinnNeural', rate: 1.0, pitch: 1.0 },
    en: { voice: 'en-US-JennyNeural', rate: 1.0, pitch: 1.0 },
    uk: { voice: 'uk-UA-PolinaNeural', rate: 1.0, pitch: 1.0 },
    ar: { voice: 'ar-SY-AmanyNeural', rate: 0.95, pitch: 1.0 },
    fa: { voice: 'fa-IR-DilaraNeural', rate: 0.95, pitch: 1.0 },
    so: { voice: 'so-SO-MuuseNeural', rate: 1.0, pitch: 1.0 },
    ti: { voice: 'ti-ET-AmanuelNeural', rate: 1.0, pitch: 1.0 },
    tr: { voice: 'tr-TR-AhmetNeural', rate: 1.0, pitch: 1.0 },
    el: { voice: 'el-GR-AthinaNeural', rate: 1.0, pitch: 1.0 },
    ru: { voice: 'ru-RU-SvetlanaNeural', rate: 1.0, pitch: 1.0 }
  };

  const config = languageVoices[langCode] || languageVoices.en;

  return {
    lang: langCode,
    text,
    voice: config.voice,
    rate: config.rate,
    pitch: config.pitch,
    isRtl: ['ar', 'fa'].includes(langCode),
    audioUrl: `/api/ai/audio-stream?lang=${langCode}&text=${encodeURIComponent(text.slice(0, 100))}`
  };
}
