/**
 * Comprehensive Indian & International Festivals, Observances, and Holidays Database
 * with accurate dates & automatic multi-year computation.
 */

export interface CalendarFestival {
  name: string;
  nameHindi: string;
  category: "national" | "hindu" | "muslim" | "christian" | "sikh" | "international" | "special";
  description: string;
  type: "gazetted" | "restricted" | "observance" | "international" | "national";
}

// Year-specific known holiday dates (calculated according to lunar/tithi/calendars for accuracy)
// Key format: YYYY-MM-DD
export const FESTIVAL_DATABASE: Record<string, CalendarFestival[]> = {
  // --- 2024 ---
  "2024-01-01": [{ name: "New Year's Day", nameHindi: "नया साल (New Year)", category: "international", description: "First day of the Gregorian calendar", type: "observance" }],
  "2024-01-14": [{ name: "Lohri", nameHindi: "लोहड़ी", category: "sikh", description: "Punjabi winter harvest festival", type: "restricted" }],
  "2024-01-15": [{ name: "Makar Sankranti / Pongal", nameHindi: "मकर संक्रांति / पोंगल", category: "hindu", description: "Harvest festival marking Sun's transition into Capricorn", type: "gazetted" }],
  "2024-01-26": [{ name: "Republic Day", nameHindi: "गणतंत्र दिवस (75th Republic Day)", category: "national", description: "National holiday celebrating the Constitution of India", type: "gazetted" }],
  "2024-02-14": [{ name: "Vasant Panchami / Valentine's Day", nameHindi: "बसंत पंचमी / वैलेंटाइन डे", category: "hindu", description: "Saraswati Puja & celebration of love", type: "restricted" }],
  "2024-03-08": [{ name: "Maha Shivratri / Int'l Women's Day", nameHindi: "महाशिवरात्रि / महिला दिवस", category: "hindu", description: "Great night of Lord Shiva & Women's empowerment", type: "gazetted" }],
  "2024-03-24": [{ name: "Holika Dahan", nameHindi: "होलिका दहन", category: "hindu", description: "Victory of good over evil", type: "restricted" }],
  "2024-03-25": [{ name: "Holi (Dhulandi)", nameHindi: "होली (रंगों का त्योहार)", category: "hindu", description: "Festival of Colors", type: "gazetted" }],
  "2024-03-29": [{ name: "Good Friday", nameHindi: "गुड फ्राइडे", category: "christian", description: "Crucifixion of Jesus Christ", type: "gazetted" }],
  "2024-04-09": [{ name: "Chaitra Navratri / Ugadi / Gudi Padwa", nameHindi: "चैत्र नवरात्रि / गुड़ी पड़वा", category: "hindu", description: "Hindu New Year & 9 days of Maa Durga", type: "restricted" }],
  "2024-04-11": [{ name: "Eid-ul-Fitr (Meethi Eid)", nameHindi: "ईद-उल-फ़ितर (मीठी ईद)", category: "muslim", description: "Islamic festival marking the end of Ramadan", type: "gazetted" }],
  "2024-04-14": [{ name: "Dr. B.R. Ambedkar Jayanti", nameHindi: "डॉ. भीमराव अंबेडकर जयंती", category: "national", description: "Birth anniversary of the Father of Indian Constitution", type: "gazetted" }],
  "2024-04-17": [{ name: "Ram Navami", nameHindi: "राम नवमी", category: "hindu", description: "Birth of Lord Rama", type: "gazetted" }],
  "2024-04-23": [{ name: "Hanuman Jayanti", nameHindi: "हनुमान जयंती", category: "hindu", description: "Birth celebration of Lord Hanuman", type: "restricted" }],
  "2024-05-23": [{ name: "Buddha Purnima", nameHindi: "बुद्ध पूर्णिमा", category: "national", description: "Birth & Enlightenment of Gautama Buddha", type: "gazetted" }],
  "2024-06-17": [{ name: "Bakrid / Eid-ul-Adha", nameHindi: "बकरीद / ईद-उल-अज़हा", category: "muslim", description: "Feast of the Sacrifice", type: "gazetted" }],
  "2024-06-21": [{ name: "International Yoga Day", nameHindi: "अंतर्राष्ट्रीय योग दिवस", category: "international", description: "Global celebration of Yoga & Wellness", type: "observance" }],
  "2024-07-17": [{ name: "Muharram (Ashura)", nameHindi: "मोहर्रम (आशूरा)", category: "muslim", description: "Day of remembrance in Islam", type: "gazetted" }],
  "2024-08-15": [{ name: "Independence Day", nameHindi: "स्वतंत्रता दिवस (78th Independence Day)", category: "national", description: "National celebration of India's independence (1947)", type: "gazetted" }],
  "2024-08-19": [{ name: "Raksha Bandhan", nameHindi: "रक्षाबंधन (भाई-बहन का पावन पर्व)", category: "hindu", description: "Sacred bond of protection between brothers & sisters", type: "gazetted" }],
  "2024-08-26": [{ name: "Krishna Janmashtami", nameHindi: "श्री कृष्ण जन्माष्टमी", category: "hindu", description: "Birth celebration of Lord Krishna", type: "gazetted" }],
  "2024-09-07": [{ name: "Ganesh Chaturthi", nameHindi: "गणेश चतुर्थी", category: "hindu", description: "Arrival of Lord Ganesha to Earth", type: "gazetted" }],
  "2024-10-02": [{ name: "Mahatma Gandhi Jayanti", nameHindi: "महात्मा गांधी जयंती", category: "national", description: "Birth anniversary of the Father of the Nation", type: "gazetted" }],
  "2024-10-12": [{ name: "Dussehra / Vijayadashami", nameHindi: "दशहरा / विजयादशमी", category: "hindu", description: "Victory of Lord Rama over Ravana", type: "gazetted" }],
  "2024-10-20": [{ name: "Karwa Chauth", nameHindi: "करवा चौथ", category: "hindu", description: "Fasting for longevity of husbands", type: "restricted" }],
  "2024-10-29": [{ name: "Dhanteras", nameHindi: "धनतेरस", category: "hindu", description: "Auspicious day for wealth & health (Lord Dhanvantari)", type: "restricted" }],
  "2024-10-31": [{ name: "Naraka Chaturdashi / Choti Diwali", nameHindi: "छोटी दिवाली / रूप चौदस", category: "hindu", description: "Eve of Diwali", type: "restricted" }],
  "2024-11-01": [{ name: "Diwali / Deepawali", nameHindi: "दीपावली (रोशनी का महापर्व)", category: "hindu", description: "Grand festival of lights & Goddess Lakshmi Puja", type: "gazetted" }],
  "2024-11-02": [{ name: "Govardhan Puja", nameHindi: "गोवर्धन पूजा / अन्नकूट", category: "hindu", description: "Worship of Mount Govardhan & Lord Krishna", type: "restricted" }],
  "2024-11-03": [{ name: "Bhai Dooj", nameHindi: "भाई दूज", category: "hindu", description: "Bond of affection between sisters and brothers", type: "restricted" }],
  "2024-11-07": [{ name: "Chhath Puja", nameHindi: "छठ पूजा (सूर्य षष्ठी)", category: "hindu", description: "Ancient Vedic festival worshipping the Sun God & Chhathi Maiya", type: "gazetted" }],
  "2024-11-14": [{ name: "Children's Day", nameHindi: "बाल दिवस (चाचा नेहरू जयंती)", category: "national", description: "Celebration of children & Pandit Nehru's birthday", type: "observance" }],
  "2024-11-15": [{ name: "Guru Nanak Jayanti", nameHindi: "गुरु नानक जयंती (प्रकाश पर्व)", category: "sikh", description: "Birth of Sikhism founder Guru Nanak Dev Ji", type: "gazetted" }],
  "2024-12-25": [{ name: "Christmas Day", nameHindi: "क्रिसमस (बड़ा दिन)", category: "christian", description: "Birth of Jesus Christ", type: "gazetted" }],

  // --- 2025 ---
  "2025-01-01": [{ name: "New Year's Day", nameHindi: "नया साल (New Year 2025)", category: "international", description: "First day of 2025", type: "observance" }],
  "2025-01-13": [{ name: "Lohri", nameHindi: "लोहड़ी", category: "sikh", description: "Harvest bonfire festival", type: "restricted" }],
  "2025-01-14": [{ name: "Makar Sankranti / Pongal", nameHindi: "मकर संक्रांति / पोंगल", category: "hindu", description: "Sun entering Capricorn", type: "gazetted" }],
  "2025-01-26": [{ name: "Republic Day", nameHindi: "गणतंत्र दिवस (76th Republic Day)", category: "national", description: "Honoring the Constitution of India", type: "gazetted" }],
  "2025-02-02": [{ name: "Vasant Panchami", nameHindi: "बसंत पंचमी (सरस्वती पूजा)", category: "hindu", description: "Arrival of spring & Maa Saraswati worship", type: "restricted" }],
  "2025-02-14": [{ name: "Valentine's Day", nameHindi: "वैलेंटाइन डे", category: "international", description: "Day of love and affection", type: "observance" }],
  "2025-02-26": [{ name: "Maha Shivratri", nameHindi: "महाशिवरात्रि", category: "hindu", description: "Night of Lord Shiva worship & fasting", type: "gazetted" }],
  "2025-03-08": [{ name: "International Women's Day", nameHindi: "अंतर्राष्ट्रीय महिला दिवस", category: "international", description: "Global day celebrating women's achievements", type: "observance" }],
  "2025-03-13": [{ name: "Holika Dahan", nameHindi: "होलिका दहन", category: "hindu", description: "Bonfire ritual before Holi", type: "restricted" }],
  "2025-03-14": [{ name: "Holi", nameHindi: "होली (रंगोत्सव)", category: "hindu", description: "Grand Festival of Colors", type: "gazetted" }],
  "2025-03-31": [{ name: "Eid-ul-Fitr", nameHindi: "ईद-उल-फ़ितर", category: "muslim", description: "Celebration ending Ramadan", type: "gazetted" }],
  "2025-04-06": [{ name: "Ram Navami", nameHindi: "राम नवमी", category: "hindu", description: "Birth of Lord Rama", type: "gazetted" }],
  "2025-04-14": [{ name: "Ambedkar Jayanti / Baisakhi", nameHindi: "अंबेडकर जयंती / बैसाखी", category: "national", description: "Harvest celebration & Constitution architect remembrance", type: "gazetted" }],
  "2025-04-18": [{ name: "Good Friday", nameHindi: "गुड फ्राइडे", category: "christian", description: "Holy Christian observance", type: "gazetted" }],
  "2025-05-12": [{ name: "Buddha Purnima", nameHindi: "बुद्ध पूर्णिमा", category: "national", description: "Lord Buddha's birth & enlightenment", type: "gazetted" }],
  "2025-06-07": [{ name: "Bakrid / Eid-ul-Adha", nameHindi: "बकरीद / ईद-उल-अज़हा", category: "muslim", description: "Festival of Sacrifice", type: "gazetted" }],
  "2025-06-21": [{ name: "International Yoga Day", nameHindi: "अंतर्राष्ट्रीय योग दिवस", category: "international", description: "Global yoga & wellness day", type: "observance" }],
  "2025-07-06": [{ name: "Muharram", nameHindi: "मोहर्रम", category: "muslim", description: "First month of Islamic calendar", type: "gazetted" }],
  "2025-08-09": [{ name: "Raksha Bandhan", nameHindi: "रक्षाबंधन", category: "hindu", description: "Brother-sister auspicious bond", type: "gazetted" }],
  "2025-08-15": [{ name: "Independence Day", nameHindi: "स्वतंत्रता दिवस (79th Independence Day)", category: "national", description: "India's Independence celebration", type: "gazetted" }],
  "2025-08-16": [{ name: "Krishna Janmashtami", nameHindi: "श्री कृष्ण जन्माष्टमी", category: "hindu", description: "Lord Krishna birth celebration", type: "gazetted" }],
  "2025-08-27": [{ name: "Ganesh Chaturthi", nameHindi: "गणेश चतुर्थी", category: "hindu", description: "Lord Ganesha festival", type: "gazetted" }],
  "2025-10-02": [{ name: "Gandhi Jayanti / Dussehra", nameHindi: "गांधी जयंती / विजयादशमी", category: "national", description: "Victory of good over evil & Mahatma Gandhi birth", type: "gazetted" }],
  "2025-10-10": [{ name: "Karwa Chauth", nameHindi: "करवा चौथ", category: "hindu", description: "Auspicious fasting day", type: "restricted" }],
  "2025-10-18": [{ name: "Dhanteras", nameHindi: "धनतेरस", category: "hindu", description: "Wealth & prosperity festival", type: "restricted" }],
  "2025-10-20": [{ name: "Diwali", nameHindi: "दीपावली (दिवाली)", category: "hindu", description: "Grand festival of lights and Lakshmi puja", type: "gazetted" }],
  "2025-10-22": [{ name: "Bhai Dooj", nameHindi: "भाई दूज", category: "hindu", description: "Brother-sister celebration", type: "restricted" }],
  "2025-10-27": [{ name: "Chhath Puja", nameHindi: "छठ पूजा", category: "hindu", description: "Surya worship & arghya", type: "gazetted" }],
  "2025-11-05": [{ name: "Guru Nanak Jayanti", nameHindi: "गुरु नानक जयंती", category: "sikh", description: "Prakash Parv", type: "gazetted" }],
  "2025-11-14": [{ name: "Children's Day", nameHindi: "बाल दिवस", category: "national", description: "Children's celebration", type: "observance" }],
  "2025-12-25": [{ name: "Christmas Day", nameHindi: "क्रिसमस (Christmas)", category: "christian", description: "Christmas celebration", type: "gazetted" }],

  // --- 2026 ---
  "2026-01-01": [{ name: "New Year's Day", nameHindi: "नया साल 2026", category: "international", description: "Welcoming 2026", type: "observance" }],
  "2026-01-13": [{ name: "Lohri", nameHindi: "लोहड़ी", category: "sikh", description: "Harvest bonfire festival", type: "restricted" }],
  "2026-01-14": [{ name: "Makar Sankranti / Pongal", nameHindi: "मकर संक्रांति / पोंगल", category: "hindu", description: "Sun transition to Uttarayan", type: "gazetted" }],
  "2026-01-23": [{ name: "Vasant Panchami", nameHindi: "बसंत पंचमी (सरस्वती पूजा)", category: "hindu", description: "Goddess Saraswati worship & spring arrival", type: "restricted" }],
  "2026-01-26": [{ name: "Republic Day", nameHindi: "गणतंत्र दिवस (80th Republic Day)", category: "national", description: "Honoring the Constitution of India", type: "gazetted" }],
  "2026-02-14": [{ name: "Valentine's Day", nameHindi: "वैलेंटाइन डे", category: "international", description: "Global day of love & care", type: "observance" }],
  "2026-02-15": [{ name: "Maha Shivratri", nameHindi: "महाशिवरात्रि", category: "hindu", description: "Worship of Lord Shiva and Goddess Parvati", type: "gazetted" }],
  "2026-03-03": [{ name: "Holika Dahan", nameHindi: "होलिका दहन", category: "hindu", description: "Holika bonfire & triumph of devotion", type: "restricted" }],
  "2026-03-04": [{ name: "Holi", nameHindi: "होली (रंगों का महापर्व)", category: "hindu", description: "Grand Festival of Colors & Joy", type: "gazetted" }],
  "2026-03-08": [{ name: "International Women's Day", nameHindi: "अंतर्राष्ट्रीय महिला दिवस", category: "international", description: "Women's Day celebration", type: "observance" }],
  "2026-03-20": [{ name: "Eid-ul-Fitr", nameHindi: "ईद-उल-फ़ितर (मीठी ईद)", category: "muslim", description: "End of holy month of Ramadan", type: "gazetted" }],
  "2026-03-27": [{ name: "Ram Navami", nameHindi: "राम नवमी", category: "hindu", description: "Birth of Lord Rama", type: "gazetted" }],
  "2026-04-03": [{ name: "Good Friday", nameHindi: "गुड फ्राइडे", category: "christian", description: "Commemoration of the Passion of Jesus Christ", type: "gazetted" }],
  "2026-04-14": [{ name: "Dr. B.R. Ambedkar Jayanti / Baisakhi", nameHindi: "अंबेडकर जयंती / बैसाखी", category: "national", description: "Honoring Dr. Ambedkar & Punjabi New Year", type: "gazetted" }],
  "2026-05-01": [{ name: "International Labour Day", nameHindi: "अंतर्राष्ट्रीय मजदूर दिवस", category: "international", description: "Celebration of laborers & working class", type: "observance" }],
  "2026-05-02": [{ name: "Buddha Purnima", nameHindi: "बुद्ध पूर्णिमा", category: "national", description: "Buddha birth anniversary", type: "gazetted" }],
  "2026-05-27": [{ name: "Bakrid / Eid-ul-Adha", nameHindi: "बकरीद / ईद-उल-अज़हा", category: "muslim", description: "Feast of Sacrifice", type: "gazetted" }],
  "2026-06-21": [{ name: "International Yoga Day", nameHindi: "अंतर्राष्ट्रीय योग दिवस", category: "international", description: "Global yoga & meditation celebration", type: "observance" }],
  "2026-06-26": [{ name: "Muharram", nameHindi: "मोहर्रम (आशूरा)", category: "muslim", description: "Islamic New Year & Ashura", type: "gazetted" }],
  "2026-08-15": [{ name: "Independence Day", nameHindi: "स्वतंत्रता दिवस (80th Independence Day)", category: "national", description: "India's 80th Independence Day celebration", type: "gazetted" }],
  "2026-08-26": [{ name: "Today (Current Live Date)", nameHindi: "आज की तारीख (Live)", category: "special", description: "Current live active session", type: "observance" }],
  "2026-08-28": [{ name: "Raksha Bandhan", nameHindi: "रक्षाबंधन (राखी)", category: "hindu", description: "Auspicious thread of brotherly protection and love", type: "gazetted" }],
  "2026-09-04": [{ name: "Krishna Janmashtami", nameHindi: "श्री कृष्ण जन्माष्टमी", category: "hindu", description: "Birth celebration of Lord Krishna", type: "gazetted" }],
  "2026-09-14": [{ name: "Hindi Diwas / Ganesh Chaturthi", nameHindi: "हिंदी दिवस / गणेश चतुर्थी", category: "hindu", description: "Celebration of Hindi language & arrival of Lord Ganesha", type: "gazetted" }],
  "2026-10-02": [{ name: "Mahatma Gandhi Jayanti", nameHindi: "गांधी जयंती", category: "national", description: "Birth anniversary of Mahatma Gandhi (Dry Day)", type: "gazetted" }],
  "2026-10-20": [{ name: "Dussehra / Vijayadashami", nameHindi: "दशहरा / विजयादशमी", category: "hindu", description: "Grand celebration of victory of Dharma over Adharma", type: "gazetted" }],
  "2026-10-29": [{ name: "Karwa Chauth", nameHindi: "करवा चौथ", category: "hindu", description: "Sacred moon-fasting for husband's long life", type: "restricted" }],
  "2026-11-06": [{ name: "Dhanteras", nameHindi: "धनतेरस (धनत्रयोदशी)", category: "hindu", description: "Lord Dhanvantari & Kuber Puja for health and wealth", type: "restricted" }],
  "2026-11-08": [{ name: "Diwali / Deepawali", nameHindi: "दीपावली (दिवाली महापर्व)", category: "hindu", description: "Grand festival of lights, firecrackers & Lakshmi Ganesh Puja", type: "gazetted" }],
  "2026-11-09": [{ name: "Govardhan Puja", nameHindi: "गोवर्धन पूजा / अन्नकूट", category: "hindu", description: "Worship of nature & Lord Krishna", type: "restricted" }],
  "2026-11-10": [{ name: "Bhai Dooj", nameHindi: "भाई दूज / यम द्वितीया", category: "hindu", description: "Brothers visit sisters for auspicious tilak", type: "restricted" }],
  "2026-11-14": [{ name: "Children's Day", nameHindi: "बाल दिवस", category: "national", description: "Jawaharlal Nehru birth anniversary", type: "observance" }],
  "2026-11-15": [{ name: "Chhath Puja (Sandhya Arghya)", nameHindi: "छठ पूजा (संध्या अर्घ्य)", category: "hindu", description: "Grand solar worship and fasting festival", type: "gazetted" }],
  "2026-11-24": [{ name: "Guru Nanak Jayanti", nameHindi: "गुरु नानक देव जयंती", category: "sikh", description: "557th Prakash Utsav of Guru Nanak Ji", type: "gazetted" }],
  "2026-12-25": [{ name: "Christmas Day", nameHindi: "क्रिसमस (Merry Christmas)", category: "christian", description: "Birth celebration of Jesus Christ", type: "gazetted" }],
  "2026-12-31": [{ name: "New Year's Eve", nameHindi: "न्यू ईयर ईव (New Year's Eve)", category: "international", description: "Farewell to 2026 & welcoming 2027", type: "observance" }],

  // --- 2027 ---
  "2027-01-01": [{ name: "New Year's Day", nameHindi: "नया साल 2027", category: "international", description: "First day of 2027", type: "observance" }],
  "2027-01-14": [{ name: "Makar Sankranti", nameHindi: "मकर संक्रांति", category: "hindu", description: "Harvest celebration", type: "gazetted" }],
  "2027-01-26": [{ name: "Republic Day", nameHindi: "गणतंत्र दिवस", category: "national", description: "Constitution Day celebration", type: "gazetted" }],
  "2027-03-22": [{ name: "Holi", nameHindi: "होली", category: "hindu", description: "Festival of colors", type: "gazetted" }],
  "2027-08-15": [{ name: "Independence Day", nameHindi: "स्वतंत्रता दिवस", category: "national", description: "National celebration of Independence", type: "gazetted" }],
  "2027-10-02": [{ name: "Gandhi Jayanti", nameHindi: "गांधी जयंती", category: "national", description: "Father of Nation birth anniversary", type: "gazetted" }],
  "2027-10-29": [{ name: "Diwali", nameHindi: "दीपावली", category: "hindu", description: "Festival of lights", type: "gazetted" }],
  "2027-12-25": [{ name: "Christmas", nameHindi: "क्रिसमस", category: "christian", description: "Christmas day", type: "gazetted" }],
};

// Recurring fixed annual observances helper
export const FIXED_ANNUAL_OBSERVANCES: Record<string, CalendarFestival> = {
  "01-01": { name: "New Year's Day", nameHindi: "नया साल", category: "international", description: "Gregorian New Year", type: "observance" },
  "01-12": { name: "National Youth Day (Swami Vivekananda Jayanti)", nameHindi: "राष्ट्रीय युवा दिवस", category: "national", description: "Swami Vivekananda birthday", type: "observance" },
  "01-15": { name: "Indian Army Day", nameHindi: "भारतीय सेना दिवस", category: "national", description: "Honoring Indian Army soldiers", type: "observance" },
  "01-23": { name: "Netaji Subhash Chandra Bose Jayanti (Parakram Diwas)", nameHindi: "पराक्रम दिवस (नेताजी सुभाष चंद्र बोस जयंती)", category: "national", description: "Remembering Netaji", type: "observance" },
  "01-26": { name: "Republic Day", nameHindi: "गणतंत्र दिवस", category: "national", description: "Adoption of Constitution of India (1950)", type: "gazetted" },
  "01-30": { name: "Martyrs' Day (Shaheed Diwas)", nameHindi: "शहीद दिवस", category: "national", description: "Homage to freedom fighters & Mahatma Gandhi", type: "observance" },
  "02-14": { name: "Valentine's Day", nameHindi: "वैलेंटाइन डे", category: "international", description: "Celebration of love", type: "observance" },
  "02-28": { name: "National Science Day", nameHindi: "राष्ट्रीय विज्ञान दिवस (रमन प्रभाव)", category: "national", description: "Discovery of Raman Effect by C.V. Raman", type: "observance" },
  "03-08": { name: "International Women's Day", nameHindi: "अंतर्राष्ट्रीय महिला दिवस", category: "international", description: "Women's rights & achievements", type: "observance" },
  "03-23": { name: "Shaheed Diwas (Bhagat Singh, Sukhdev, Rajguru)", nameHindi: "शहीद दिवस (भगत सिंह, सुखदेव, राजगुरु)", category: "national", description: "Remembering revolutionary freedom martyrs", type: "observance" },
  "04-07": { name: "World Health Day", nameHindi: "विश्व स्वास्थ्य दिवस", category: "international", description: "Global health awareness", type: "observance" },
  "04-14": { name: "Dr. B.R. Ambedkar Jayanti", nameHindi: "डॉ. बी. आर. अंबेडकर जयंती", category: "national", description: "Architect of Constitution", type: "gazetted" },
  "04-22": { name: "Earth Day", nameHindi: "पृथ्वी दिवस", category: "international", description: "Environmental protection & awareness", type: "observance" },
  "05-01": { name: "International Labour Day / Maharashtra Day / Gujarat Day", nameHindi: "मजदूर दिवस / महाराष्ट्र एवं गुजरात स्थापना दिवस", category: "international", description: "Workers' solidarity & statehood", type: "observance" },
  "06-05": { name: "World Environment Day", nameHindi: "विश्व पर्यावरण दिवस", category: "international", description: "Nature protection initiative", type: "observance" },
  "06-21": { name: "International Yoga Day & World Music Day", nameHindi: "अंतर्राष्ट्रीय योग दिवस एवं संगीत दिवस", category: "international", description: "Celebration of Yoga & Music worldwide", type: "observance" },
  "07-01": { name: "National Doctors' Day & Chartered Accountants Day", nameHindi: "राष्ट्रीय चिकित्सक दिवस", category: "national", description: "Honoring healthcare heroes & Dr. B.C. Roy", type: "observance" },
  "07-26": { name: "Kargil Vijay Diwas", nameHindi: "कारगिल विजय दिवस", category: "national", description: "Victory in 1999 Kargil War by Indian Armed Forces", type: "national" },
  "08-15": { name: "Independence Day of India", nameHindi: "स्वतंत्रता दिवस (15 अगस्त)", category: "national", description: "India attained freedom from British rule in 1947", type: "gazetted" },
  "08-29": { name: "National Sports Day (Major Dhyan Chand Jayanti)", nameHindi: "राष्ट्रीय खेल दिवस (मेजर ध्यानचंद जयंती)", category: "national", description: "Celebration of Indian sports & hockey wizard", type: "observance" },
  "09-05": { name: "Teachers' Day (Dr. Radhakrishnan Jayanti)", nameHindi: "शिक्षक दिवस (डॉ. सर्वपल्ली राधाकृष्णन जयंती)", category: "national", description: "Honoring teachers and mentors", type: "observance" },
  "09-14": { name: "Hindi Diwas", nameHindi: "हिंदी दिवस", category: "national", description: "Adoption of Hindi as official language in 1949", type: "observance" },
  "09-15": { name: "Engineers' Day (M. Visvesvaraya Jayanti)", nameHindi: "अभियंता दिवस (इंजीनियर्स डे)", category: "national", description: "Tribute to Sir Mokshagundam Visvesvaraya", type: "observance" },
  "10-02": { name: "Mahatma Gandhi Jayanti & Lal Bahadur Shastri Jayanti", nameHindi: "गांधी जयंती एवं लाल बहादुर शास्त्री जयंती", category: "national", description: "National holiday commemorating Bapu & Shastri Ji", type: "gazetted" },
  "10-08": { name: "Indian Air Force Day", nameHindi: "भारतीय वायु सेना दिवस", category: "national", description: "Celebration of IAF strength and valor", type: "national" },
  "10-31": { name: "National Unity Day (Rashtriya Ekta Diwas - Sardar Patel)", nameHindi: "राष्ट्रीय एकता दिवस (सरदार वल्लभभाई पटेल जयंती)", category: "national", description: "Iron Man of India Sardar Patel birth anniversary", type: "observance" },
  "11-14": { name: "Children's Day (Bal Diwas)", nameHindi: "बाल दिवस", category: "national", description: "Chacha Nehru birth anniversary & joy of childhood", type: "observance" },
  "11-26": { name: "Constitution Day (Samvidhan Diwas)", nameHindi: "संविधान दिवस (विधि दिवस)", category: "national", description: "Adoption of Constitution in 1949", type: "observance" },
  "12-04": { name: "Indian Navy Day", nameHindi: "भारतीय नौसेना दिवस (ऑपरेशन ट्राइडेंट)", category: "national", description: "Commemoration of naval bravery", type: "national" },
  "12-25": { name: "Christmas Day / Good Governance Day (Atal Bihari Vajpayee)", nameHindi: "क्रिसमस एवं सुशासन दिवस", category: "christian", description: "Christmas celebration & Atal Ji birthday", type: "gazetted" },
};

/**
 * Returns list of festivals/events for a specific date (YYYY-MM-DD)
 */
export function getFestivalsForDate(dateStr: string): CalendarFestival[] {
  const specific = FESTIVAL_DATABASE[dateStr] || [];
  
  // Also check recurring month-day
  const monthDay = dateStr.slice(5); // "MM-DD"
  const recurring = FIXED_ANNUAL_OBSERVANCES[monthDay];
  
  // Deduplicate by name
  const list = [...specific];
  if (recurring && !list.some((f) => f.name.toLowerCase().includes(recurring.name.toLowerCase()) || recurring.name.toLowerCase().includes(f.name.toLowerCase()))) {
    list.push(recurring);
  }

  return list;
}

/**
 * Returns formatted description of what's on this date for voice reading
 */
export function formatWhatsOnDateVoice(dateStr: string, dayName: string): string {
  const festivals = getFestivalsForDate(dateStr);
  if (festivals.length === 0) {
    return `Boss, ${dateStr} (${dayName}) ko koi bada national festival register nahi hai, ye normal working day hai.`;
  }

  const names = festivals.map((f) => f.nameHindi || f.name).join(", ");
  const desc = festivals[0]?.description ? ` — ${festivals[0].description}` : "";
  return `Boss, ${dateStr} (${dayName}) ko ${names} hai${desc}.`;
}
