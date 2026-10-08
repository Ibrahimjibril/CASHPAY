"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "en" | "zh" | "fr" | "ar" | "hi" | "ha";
export const LANGS: { code: Lang; name: string }[] = [
  { code: "en", name: "English" },
  { code: "zh", name: "中文 (Chinese)" },
  { code: "fr", name: "Français (French)" },
  { code: "ar", name: "العربية (Arabic)" },
  { code: "hi", name: "हिन्दी (Hindi)" },
  { code: "ha", name: "Hausa" },
];

type Dict = Record<string, string>;

const en: Dict = {
  nav_overview: "Overview", nav_send: "Send Money", nav_bulk: "Bulk Send", nav_tips: "Tips", nav_tx: "Transactions", nav_settings: "Settings",
  promo1: "Join the", promo2: "Social Economy", promoText: "Get tipped. Support creators. Be part of CashPay.", learnMore: "Learn More",
  searchPh: "Search users, @username, or transactions...", tempoNet: "Tempo Network",
  welcome: "Welcome back,", welcomeSub: "Here's what's happening with your CashPay account.", walletAddr: "Your Wallet Address",
  statUsers: "Total Users", statBalance: "Total Wallet Balance", statTips: "Total Tips Received", statTx: "Total Transactions", last7d: "from last 7 days",
  balOverview: "Wallet Balance Overview", balSub: "Your wallet balance over the last {n} days", range7: "Last 7 days", range14: "Last 14 days", range30: "Last 30 days",
  recentTx: "Recent Transactions", viewAll: "View all", colType: "Type", colUser: "User", colAmount: "Amount", colStatus: "Status", colTime: "Time",
  noActivity: "Your payment activity will appear here.",
  quick: "Quick Actions", qSend: "Send Money", qSendS: "Quick & easy transfer", qBulk: "Bulk Send", qBulkS: "Pay many people at once",
  qTip: "Tip Someone", qTipS: "Support a creator", qSet: "Settings", qSetS: "Manage your app",
  recentAct: "Recent Activity", banner: "Your support powers creators and builds the social internet.",
  tTipRecv: "Tip received", tPayRecv: "Payment received", tTipSent: "Tip sent", tPaySent: "Payment sent", tClaimed: "Tip claimed", tWallet: "Wallet created",
  stDone: "Completed", stPend: "Pending", stFail: "Failed", stRev: "Review",
  thA: "Transaction", thB: "History", thSub: "Everything you sent and received on CashPay.",
  fAll: "All", fRecv: "Received", fSent: "Sent", fTips: "Tips", searchTx: "Search transactions…",
  rcpt: "Payment receipt", rType: "Type", rFrom: "From", rTo: "To", rYou: "You", rMsg: "Message", rDate: "Date", rAsset: "Asset", rNet: "Network",
  rClaim: "Claim", rClaimed: "✓ Claimed", rWaiting: "Waiting to be claimed", rTx: "Transaction",
  rTip: "Tip: take a screenshot of this receipt to share it as proof of payment.", rExplorer: "View on Explorer", rCopyLink: "Copy claim link",
  rCopied: "Copied ✓", rResend: "Resend email", rSending: "Sending…", rEmailOk: "✓ Email sent.", rEmailFail: "Couldn't send the email:",
  sA: "Your", sB: "Settings", sSub: "Manage your profile and wallet.", sProfile: "Profile", sViewProfile: "View public profile",
  sWallet: "Wallet", sAddress: "Address", sCopyAddr: "Copy address", sCopied: "Copied", sLang: "Language", sLangSub: "Choose the language of the app.",
  sAccount: "Account", sAccountText: "Your wallet keys are managed securely by Privy. CashPay never sees your private keys.", sSignOut: "Sign out",
  retry: "Retry", dashErr: "We couldn't load your dashboard. Please try again.",
  agoS: "{n}s ago", agoM: "{n}m ago", agoH: "{n}h ago", agoD: "{n}d ago",
};

const zh: Dict = {
  nav_overview: "概览", nav_send: "转账", nav_bulk: "批量转账", nav_tips: "打赏", nav_tx: "交易记录", nav_settings: "设置",
  promo1: "加入", promo2: "社交经济", promoText: "获得打赏，支持创作者，成为 CashPay 的一员。", learnMore: "了解更多",
  searchPh: "搜索用户、@用户名或交易...", tempoNet: "Tempo 网络",
  welcome: "欢迎回来，", welcomeSub: "这是您的 CashPay 账户动态。", walletAddr: "您的钱包地址",
  statUsers: "用户总数", statBalance: "钱包总余额", statTips: "收到的打赏总额", statTx: "交易总数", last7d: "较过去 7 天",
  balOverview: "钱包余额概览", balSub: "过去 {n} 天的钱包余额", range7: "最近 7 天", range14: "最近 14 天", range30: "最近 30 天",
  recentTx: "最近交易", viewAll: "查看全部", colType: "类型", colUser: "用户", colAmount: "金额", colStatus: "状态", colTime: "时间",
  noActivity: "您的付款记录将显示在这里。",
  quick: "快捷操作", qSend: "转账", qSendS: "快速便捷的转账", qBulk: "批量转账", qBulkS: "一次向多人付款",
  qTip: "打赏他人", qTipS: "支持创作者", qSet: "设置", qSetS: "管理您的应用",
  recentAct: "最近动态", banner: "您的支持助力创作者，共建社交互联网。",
  tTipRecv: "收到打赏", tPayRecv: "收到付款", tTipSent: "已发送打赏", tPaySent: "已付款", tClaimed: "打赏已领取", tWallet: "钱包已创建",
  stDone: "已完成", stPend: "处理中", stFail: "失败", stRev: "审核中",
  thA: "交易", thB: "记录", thSub: "您在 CashPay 上发送和收到的所有款项。",
  fAll: "全部", fRecv: "已收到", fSent: "已发送", fTips: "打赏", searchTx: "搜索交易…",
  rcpt: "付款回执", rType: "类型", rFrom: "付款方", rTo: "收款方", rYou: "您", rMsg: "留言", rDate: "日期", rAsset: "资产", rNet: "网络",
  rClaim: "领取", rClaimed: "✓ 已领取", rWaiting: "等待领取", rTx: "交易",
  rTip: "提示：截取此回执的屏幕截图，可作为付款凭证分享。", rExplorer: "在浏览器中查看", rCopyLink: "复制领取链接",
  rCopied: "已复制 ✓", rResend: "重新发送邮件", rSending: "发送中…", rEmailOk: "✓ 邮件已发送。", rEmailFail: "无法发送邮件：",
  sA: "您的", sB: "设置", sSub: "管理您的个人资料和钱包。", sProfile: "个人资料", sViewProfile: "查看公开资料",
  sWallet: "钱包", sAddress: "地址", sCopyAddr: "复制地址", sCopied: "已复制", sLang: "语言", sLangSub: "选择应用语言。",
  sAccount: "账户", sAccountText: "您的钱包密钥由 Privy 安全管理。CashPay 不会看到您的私钥。", sSignOut: "退出登录",
  retry: "重试", dashErr: "无法加载仪表板，请重试。",
  agoS: "{n} 秒前", agoM: "{n} 分钟前", agoH: "{n} 小时前", agoD: "{n} 天前",
};

const fr: Dict = {
  nav_overview: "Aperçu", nav_send: "Envoyer de l'argent", nav_bulk: "Envoi groupé", nav_tips: "Pourboires", nav_tx: "Transactions", nav_settings: "Paramètres",
  promo1: "Rejoignez l'", promo2: "Économie sociale", promoText: "Recevez des pourboires. Soutenez les créateurs. Faites partie de CashPay.", learnMore: "En savoir plus",
  searchPh: "Rechercher des utilisateurs, @pseudo ou transactions...", tempoNet: "Réseau Tempo",
  welcome: "Bon retour,", welcomeSub: "Voici ce qui se passe sur votre compte CashPay.", walletAddr: "Adresse de votre portefeuille",
  statUsers: "Utilisateurs au total", statBalance: "Solde total du portefeuille", statTips: "Pourboires reçus au total", statTx: "Transactions au total", last7d: "depuis 7 jours",
  balOverview: "Aperçu du solde du portefeuille", balSub: "Solde de votre portefeuille ces {n} derniers jours", range7: "7 derniers jours", range14: "14 derniers jours", range30: "30 derniers jours",
  recentTx: "Transactions récentes", viewAll: "Tout voir", colType: "Type", colUser: "Utilisateur", colAmount: "Montant", colStatus: "Statut", colTime: "Heure",
  noActivity: "Votre activité de paiement apparaîtra ici.",
  quick: "Actions rapides", qSend: "Envoyer de l'argent", qSendS: "Transfert rapide et facile", qBulk: "Envoi groupé", qBulkS: "Payez plusieurs personnes à la fois",
  qTip: "Donner un pourboire", qTipS: "Soutenez un créateur", qSet: "Paramètres", qSetS: "Gérez votre application",
  recentAct: "Activité récente", banner: "Votre soutien aide les créateurs et construit l'internet social.",
  tTipRecv: "Pourboire reçu", tPayRecv: "Paiement reçu", tTipSent: "Pourboire envoyé", tPaySent: "Paiement envoyé", tClaimed: "Pourboire récupéré", tWallet: "Portefeuille créé",
  stDone: "Terminé", stPend: "En attente", stFail: "Échoué", stRev: "En vérification",
  thA: "Historique des", thB: "transactions", thSub: "Tout ce que vous avez envoyé et reçu sur CashPay.",
  fAll: "Tout", fRecv: "Reçus", fSent: "Envoyés", fTips: "Pourboires", searchTx: "Rechercher des transactions…",
  rcpt: "Reçu de paiement", rType: "Type", rFrom: "De", rTo: "À", rYou: "Vous", rMsg: "Message", rDate: "Date", rAsset: "Actif", rNet: "Réseau",
  rClaim: "Récupération", rClaimed: "✓ Récupéré", rWaiting: "En attente de récupération", rTx: "Transaction",
  rTip: "Astuce : faites une capture d'écran de ce reçu pour le partager comme preuve de paiement.", rExplorer: "Voir sur l'explorateur", rCopyLink: "Copier le lien de récupération",
  rCopied: "Copié ✓", rResend: "Renvoyer l'e-mail", rSending: "Envoi…", rEmailOk: "✓ E-mail envoyé.", rEmailFail: "Impossible d'envoyer l'e-mail :",
  sA: "Vos", sB: "paramètres", sSub: "Gérez votre profil et votre portefeuille.", sProfile: "Profil", sViewProfile: "Voir le profil public",
  sWallet: "Portefeuille", sAddress: "Adresse", sCopyAddr: "Copier l'adresse", sCopied: "Copié", sLang: "Langue", sLangSub: "Choisissez la langue de l'application.",
  sAccount: "Compte", sAccountText: "Les clés de votre portefeuille sont gérées en toute sécurité par Privy. CashPay ne voit jamais vos clés privées.", sSignOut: "Se déconnecter",
  retry: "Réessayer", dashErr: "Impossible de charger votre tableau de bord. Veuillez réessayer.",
  agoS: "il y a {n} s", agoM: "il y a {n} min", agoH: "il y a {n} h", agoD: "il y a {n} j",
};

const ar: Dict = {
  nav_overview: "نظرة عامة", nav_send: "إرسال الأموال", nav_bulk: "إرسال جماعي", nav_tips: "الإكراميات", nav_tx: "المعاملات", nav_settings: "الإعدادات",
  promo1: "انضم إلى", promo2: "الاقتصاد الاجتماعي", promoText: "احصل على الإكراميات. ادعم المبدعين. كن جزءًا من CashPay.", learnMore: "اعرف المزيد",
  searchPh: "ابحث عن المستخدمين أو @اسم_المستخدم أو المعاملات...", tempoNet: "شبكة Tempo",
  welcome: "مرحبًا بعودتك،", welcomeSub: "إليك ما يحدث في حسابك على CashPay.", walletAddr: "عنوان محفظتك",
  statUsers: "إجمالي المستخدمين", statBalance: "إجمالي رصيد المحفظة", statTips: "إجمالي الإكراميات المستلمة", statTx: "إجمالي المعاملات", last7d: "خلال آخر 7 أيام",
  balOverview: "نظرة عامة على رصيد المحفظة", balSub: "رصيد محفظتك خلال آخر {n} أيام", range7: "آخر 7 أيام", range14: "آخر 14 يومًا", range30: "آخر 30 يومًا",
  recentTx: "أحدث المعاملات", viewAll: "عرض الكل", colType: "النوع", colUser: "المستخدم", colAmount: "المبلغ", colStatus: "الحالة", colTime: "الوقت",
  noActivity: "ستظهر هنا أنشطة الدفع الخاصة بك.",
  quick: "إجراءات سريعة", qSend: "إرسال الأموال", qSendS: "تحويل سريع وسهل", qBulk: "إرسال جماعي", qBulkS: "ادفع لعدة أشخاص دفعة واحدة",
  qTip: "أعطِ إكرامية", qTipS: "ادعم مبدعًا", qSet: "الإعدادات", qSetS: "إدارة تطبيقك",
  recentAct: "النشاط الأخير", banner: "دعمك يمكّن المبدعين ويبني الإنترنت الاجتماعي.",
  tTipRecv: "تم استلام إكرامية", tPayRecv: "تم استلام دفعة", tTipSent: "تم إرسال إكرامية", tPaySent: "تم إرسال دفعة", tClaimed: "تمت المطالبة بالإكرامية", tWallet: "تم إنشاء المحفظة",
  stDone: "مكتمل", stPend: "قيد الانتظار", stFail: "فشل", stRev: "قيد المراجعة",
  thA: "سجل", thB: "المعاملات", thSub: "كل ما أرسلته واستلمته على CashPay.",
  fAll: "الكل", fRecv: "المستلمة", fSent: "المرسلة", fTips: "الإكراميات", searchTx: "ابحث في المعاملات…",
  rcpt: "إيصال الدفع", rType: "النوع", rFrom: "من", rTo: "إلى", rYou: "أنت", rMsg: "الرسالة", rDate: "التاريخ", rAsset: "الأصل", rNet: "الشبكة",
  rClaim: "المطالبة", rClaimed: "✓ تمت المطالبة", rWaiting: "في انتظار المطالبة", rTx: "المعاملة",
  rTip: "نصيحة: التقط لقطة شاشة لهذا الإيصال لمشاركته كدليل على الدفع.", rExplorer: "عرض في المستكشف", rCopyLink: "نسخ رابط المطالبة",
  rCopied: "تم النسخ ✓", rResend: "إعادة إرسال البريد", rSending: "جارٍ الإرسال…", rEmailOk: "✓ تم إرسال البريد.", rEmailFail: "تعذر إرسال البريد:",
  sA: "إعدادات", sB: "حسابك", sSub: "إدارة ملفك الشخصي ومحفظتك.", sProfile: "الملف الشخصي", sViewProfile: "عرض الملف العام",
  sWallet: "المحفظة", sAddress: "العنوان", sCopyAddr: "نسخ العنوان", sCopied: "تم النسخ", sLang: "اللغة", sLangSub: "اختر لغة التطبيق.",
  sAccount: "الحساب", sAccountText: "تتم إدارة مفاتيح محفظتك بأمان بواسطة Privy. لا ترى CashPay مفاتيحك الخاصة أبدًا.", sSignOut: "تسجيل الخروج",
  retry: "إعادة المحاولة", dashErr: "تعذر تحميل لوحة التحكم. يرجى المحاولة مرة أخرى.",
  agoS: "منذ {n} ث", agoM: "منذ {n} د", agoH: "منذ {n} س", agoD: "منذ {n} يوم",
};

const hi: Dict = {
  nav_overview: "ओवरव्यू", nav_send: "पैसे भेजें", nav_bulk: "बल्क सेंड", nav_tips: "टिप्स", nav_tx: "लेन-देन", nav_settings: "सेटिंग्स",
  promo1: "जुड़ें", promo2: "सोशल इकोनॉमी से", promoText: "टिप पाएं। क्रिएटर्स को सपोर्ट करें। CashPay का हिस्सा बनें।", learnMore: "और जानें",
  searchPh: "यूज़र, @username या लेन-देन खोजें...", tempoNet: "Tempo नेटवर्क",
  welcome: "वापसी पर स्वागत है,", welcomeSub: "आपके CashPay खाते में यह सब हो रहा है।", walletAddr: "आपका वॉलेट पता",
  statUsers: "कुल यूज़र", statBalance: "कुल वॉलेट बैलेंस", statTips: "प्राप्त कुल टिप्स", statTx: "कुल लेन-देन", last7d: "पिछले 7 दिनों से",
  balOverview: "वॉलेट बैलेंस का अवलोकन", balSub: "पिछले {n} दिनों में आपका वॉलेट बैलेंस", range7: "पिछले 7 दिन", range14: "पिछले 14 दिन", range30: "पिछले 30 दिन",
  recentTx: "हाल के लेन-देन", viewAll: "सभी देखें", colType: "प्रकार", colUser: "यूज़र", colAmount: "राशि", colStatus: "स्थिति", colTime: "समय",
  noActivity: "आपकी भुगतान गतिविधि यहाँ दिखाई देगी।",
  quick: "त्वरित कार्य", qSend: "पैसे भेजें", qSendS: "तेज़ और आसान ट्रांसफर", qBulk: "बल्क सेंड", qBulkS: "एक साथ कई लोगों को भुगतान करें",
  qTip: "किसी को टिप दें", qTipS: "किसी क्रिएटर को सपोर्ट करें", qSet: "सेटिंग्स", qSetS: "अपना ऐप मैनेज करें",
  recentAct: "हाल की गतिविधि", banner: "आपका सहयोग क्रिएटर्स को ताकत देता है और सोशल इंटरनेट बनाता है।",
  tTipRecv: "टिप मिली", tPayRecv: "भुगतान मिला", tTipSent: "टिप भेजी गई", tPaySent: "भुगतान भेजा गया", tClaimed: "टिप क्लेम की गई", tWallet: "वॉलेट बनाया गया",
  stDone: "पूर्ण", stPend: "लंबित", stFail: "विफल", stRev: "समीक्षा में",
  thA: "लेन-देन", thB: "इतिहास", thSub: "CashPay पर आपने जो भी भेजा और पाया।",
  fAll: "सभी", fRecv: "प्राप्त", fSent: "भेजे गए", fTips: "टिप्स", searchTx: "लेन-देन खोजें…",
  rcpt: "भुगतान रसीद", rType: "प्रकार", rFrom: "प्रेषक", rTo: "प्राप्तकर्ता", rYou: "आप", rMsg: "संदेश", rDate: "तारीख", rAsset: "एसेट", rNet: "नेटवर्क",
  rClaim: "क्लेम", rClaimed: "✓ क्लेम किया गया", rWaiting: "क्लेम का इंतज़ार", rTx: "लेन-देन",
  rTip: "सुझाव: भुगतान के प्रमाण के रूप में साझा करने के लिए इस रसीद का स्क्रीनशॉट लें।", rExplorer: "एक्सप्लोरर पर देखें", rCopyLink: "क्लेम लिंक कॉपी करें",
  rCopied: "कॉपी हो गया ✓", rResend: "ईमेल फिर भेजें", rSending: "भेजा जा रहा है…", rEmailOk: "✓ ईमेल भेज दिया गया।", rEmailFail: "ईमेल नहीं भेजा जा सका:",
  sA: "आपकी", sB: "सेटिंग्स", sSub: "अपनी प्रोफ़ाइल और वॉलेट मैनेज करें।", sProfile: "प्रोफ़ाइल", sViewProfile: "सार्वजनिक प्रोफ़ाइल देखें",
  sWallet: "वॉलेट", sAddress: "पता", sCopyAddr: "पता कॉपी करें", sCopied: "कॉपी हो गया", sLang: "भाषा", sLangSub: "ऐप की भाषा चुनें।",
  sAccount: "खाता", sAccountText: "आपके वॉलेट की कीज़ Privy द्वारा सुरक्षित रूप से मैनेज की जाती हैं। CashPay आपकी प्राइवेट कीज़ कभी नहीं देखता।", sSignOut: "साइन आउट",
  retry: "फिर कोशिश करें", dashErr: "आपका डैशबोर्ड लोड नहीं हो सका। कृपया फिर कोशिश करें।",
  agoS: "{n} सेकंड पहले", agoM: "{n} मिनट पहले", agoH: "{n} घंटे पहले", agoD: "{n} दिन पहले",
};

const ha: Dict = {
  nav_overview: "Gabaɗaya", nav_send: "Aika Kuɗi", nav_bulk: "Aika ga Mutane Da Yawa", nav_tips: "Tukwici", nav_tx: "Mu'amaloli", nav_settings: "Saituna",
  promo1: "Shiga", promo2: "Tattalin Arzikin Al'umma", promoText: "Samu tukwici. Goyi bayan masu kirkira. Zama ɓangare na CashPay.", learnMore: "Ƙara Koyo",
  searchPh: "Nemi masu amfani, @username, ko mu'amaloli...", tempoNet: "Hanyar Sadarwar Tempo",
  welcome: "Barka da dawowa,", welcomeSub: "Ga abin da ke faruwa a asusunka na CashPay.", walletAddr: "Adireshin Wallet Ɗinka",
  statUsers: "Jimillar Masu Amfani", statBalance: "Jimillar Kuɗin Wallet", statTips: "Jimillar Tukwicin da Aka Karɓa", statTx: "Jimillar Mu'amaloli", last7d: "daga kwanaki 7 da suka wuce",
  balOverview: "Bayanin Kuɗin Wallet", balSub: "Kuɗin wallet ɗinka cikin kwanaki {n} da suka wuce", range7: "Kwanaki 7 da suka wuce", range14: "Kwanaki 14 da suka wuce", range30: "Kwanaki 30 da suka wuce",
  recentTx: "Mu'amalolin Kwanan Nan", viewAll: "Duba duka", colType: "Nau'i", colUser: "Mai amfani", colAmount: "Adadi", colStatus: "Matsayi", colTime: "Lokaci",
  noActivity: "Ayyukan biyan kuɗinka za su bayyana a nan.",
  quick: "Ayyuka Cikin Sauri", qSend: "Aika Kuɗi", qSendS: "Aika kuɗi cikin sauƙi", qBulk: "Aika ga Mutane Da Yawa", qBulkS: "Biya mutane da yawa lokaci guda",
  qTip: "Ba da Tukwici", qTipS: "Goyi bayan mai kirkira", qSet: "Saituna", qSetS: "Sarrafa manhajarka",
  recentAct: "Ayyukan Kwanan Nan", banner: "Goyon bayanka yana ƙarfafa masu kirkira kuma yana gina intanet na al'umma.",
  tTipRecv: "An karɓi tukwici", tPayRecv: "An karɓi kuɗi", tTipSent: "An aika tukwici", tPaySent: "An aika kuɗi", tClaimed: "An ɗauki tukwici", tWallet: "An ƙirƙiri wallet",
  stDone: "An kammala", stPend: "Ana jira", stFail: "Ya gaza", stRev: "Ana dubawa",
  thA: "Tarihin", thB: "Mu'amaloli", thSub: "Duk abin da ka aika da karɓa a CashPay.",
  fAll: "Duka", fRecv: "An karɓa", fSent: "An aika", fTips: "Tukwici", searchTx: "Nemi mu'amaloli…",
  rcpt: "Rasidin biyan kuɗi", rType: "Nau'i", rFrom: "Daga", rTo: "Zuwa", rYou: "Kai", rMsg: "Saƙo", rDate: "Kwanan wata", rAsset: "Kadara", rNet: "Hanyar sadarwa",
  rClaim: "Ɗauka", rClaimed: "✓ An ɗauka", rWaiting: "Ana jiran a ɗauka", rTx: "Mu'amala",
  rTip: "Shawara: ɗauki hoton allo na wannan rasidi don nuna shaidar biyan kuɗi.", rExplorer: "Duba a Explorer", rCopyLink: "Kwafi hanyar ɗaukar kuɗi",
  rCopied: "An kwafa ✓", rResend: "Sake aika imel", rSending: "Ana aikawa…", rEmailOk: "✓ An aika imel.", rEmailFail: "Ba a iya aika imel ba:",
  sA: "Saitunanka", sB: "", sSub: "Sarrafa bayananka da wallet ɗinka.", sProfile: "Bayanai", sViewProfile: "Duba bayanin jama'a",
  sWallet: "Wallet", sAddress: "Adireshi", sCopyAddr: "Kwafi adireshi", sCopied: "An kwafa", sLang: "Harshe", sLangSub: "Zaɓi harshen manhajar.",
  sAccount: "Asusu", sAccountText: "Privy ne ke kula da makullan wallet ɗinka cikin tsaro. CashPay ba ya taɓa ganin makullanka na sirri.", sSignOut: "Fita",
  retry: "Sake gwadawa", dashErr: "Ba mu iya loda dashboard ɗinka ba. Don Allah a sake gwadawa.",
  agoS: "{n} dakika da suka wuce", agoM: "{n} minti da suka wuce", agoH: "{n} awa da suka wuce", agoD: "{n} kwana da suka wuce",
};

const D: Record<Lang, Dict> = { en, zh, fr, ar, hi, ha };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string, v?: Record<string, string | number>) => string };
const C = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setL] = useState<Lang>("en");

  useEffect(() => {
    try {
      const s = localStorage.getItem("cp-lang") as Lang | null;
      if (s && D[s]) setL(s);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setL(l);
    try { localStorage.setItem("cp-lang", l); } catch {}
  }, []);

  const t = useCallback(
    (k: string, v?: Record<string, string | number>) => {
      let s = D[lang][k] ?? en[k] ?? k;
      if (v) for (const x in v) s = s.replace(`{${x}}`, String(v[x]));
      return s;
    },
    [lang]
  );

  return <C.Provider value={{ lang, setLang, t }}>{children}</C.Provider>;
}

export const useI18n = () => useContext(C);
