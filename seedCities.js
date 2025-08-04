const mongoose = require("mongoose");
const City = require("./models/city"); // Assuming you have a City model defined
const connectDB = require('./config/db');

const citiesData = [
  {
    "name": "Abbottabad",
    "towns": ["Noor Mang"]
  },
  {
    "name": "Astore",
    "towns": ["Rupal"]
  },
  {
    "name": "Athmuqam",
    "towns": ["Athmuqam"]
  },
  {
    "name": "Attock",
    "towns": ["Fateh Jang", "Jand", "Lawrencepur"]
  },
  {
    "name": "Awaran",
    "towns": ["Awaran"]
  },
  {
    "name": "Azad Kashmir",
    "towns": ["Muzaffarabad"]
  },
  {
    "name": "Badin",
    "towns": ["Badin"]
  },
  {
    "name": "Bagh",
    "towns": ["Bagh"]
  },
  {
    "name": "Bahawalnagar",
    "towns": [
      "Bahawalnagar",
      "Chishtian",
      "Dona Qutab Saru",
      "Dunga Bunga",
      "Faqirwali",
      "Haroonabad",
      "Laleka",
      "Marot",
      "Minchinabad",
      "Qasimka",
      "Toba Qalandar Shah"
    ]
  },
  {
    "name": "Bahawalpur",
    "towns": [
      "Ahmedpur East",
      "Bahawalpur",
      "Dadwala",
      "Ganehar",
      "Khairpur Tamiwali",
      "Khanqah Sharif",
      "Qaimpur",
      "Yazman"
    ]
  },
  {
    "name": "Bannu",
    "towns": ["Bannu"]
  },
  {
    "name": "Barkhan",
    "towns": ["Barkhan"]
  },
  {
    "name": "Battagram",
    "towns": ["Battagram"]
  },
  {
    "name": "Bhakkar",
    "towns": [
      "Darya Khan",
      "Kallurkot",
      "Notak",
      "Notak Bhakkar"
    ]
  },
  {
    "name": "Buner",
    "towns": ["Dadu"]
  },
  {
    "name": "Chaghi",
    "towns": ["Dalbandin"]
  },
  {
    "name": "Chakwal",
    "towns": [
      "Chakwal",
      "Choa Saidan Shah",
      "Dhurnal",
      "Jabairpur"
    ]
  },
  {
    "name": "Charsadda",
    "towns": ["Charsadda"]
  },
  {
    "name": "Chiniot",
    "towns": [
      "Chiniot",
      "Hast Khewa",
      "Lalian",
      "Rabwah"
    ]
  },
  {
    "name": "Chitral",
    "towns": ["Chitral"]
  },
  {
    "name": "Dera Bugti",
    "towns": ["Sui"]
  },
  {
    "name": "Dera Ghazi Khan",
    "towns": [
      "Aaliwala",
      "Bahadur Garh",
      "Basti Buzdar",
      "Basti Fauja",
      "Basti Malana",
      "Choti Zerine",
      "Chotibala",
      "Churatta",
      "Dera Ghazi Khan",
      "Fateh Khan",
      "Fazal Katchh",
      "Gadai",
      "Ghaus Abad",
      "Gulzar Khanwala",
      "Gulzarwala",
      "Haji Ghazi",
      "Jakhar Imam Shah",
      "Jhoke Uttra",
      "Kot Haibat",
      "Kot Mubarak",
      "Kot Qaisrani",
      "Lakhani",
      "Mamoori",
      "Manghrotha",
      "Mutafariq Chahan",
      "Nari Shumali",
      "Nawan",
      "Pir Adil",
      "Samina",
      "Shah Sadar Din",
      "Sokar",
      "Taunsa Sharif",
      "Tibbi Qaisrani",
      "Tuman Leghari",
      "Tuman Qaisrani",
      "Wadore"
    ]
  },
  {
    "name": "Dera Ismail Khan",
    "towns": ["Dera Ismail Khan", "Kulachi"]
  },
  {
    "name": "Faisalabad",
    "towns": [
      "Aminpur",
      "Dijkot",
      "Jaranwala",
      "Samundri",
      "Surajpur",
      "Tandlianwala"
    ]
  },
  {
    "name": "Gwadar",
    "towns": ["Gwadar", "Ormara"]
  },
  {
    "name": "Gilgit-Baltistan",
    "towns": ["Chilas", "Dainyor", "Gahkuch", "Gilgit", "Skardu"]
  },
  {
    "name": "Ghotki",
    "towns": ["Ghotki"]
  },
  {
    "name": "Gujranwala",
    "towns": [
      "Ahmed Nager Chatha",
      "Ali Pur Chatta",
      "Eimen Abad",
      "Gujranwala",
      "Qila Mihan Singh",
      "Rana Colony",
      "Sadhoke",
      "Saroke",
      "Sodhra"
    ]
  },
  {
    "name": "Gujrat",
    "towns": [
      "Addowal",
      "Ajnala",
      "Alamgarh",
      "Bagrianwala",
      "Baharwal",
      "Bareela",
      "Baroo",
      "Beharaj",
      "Behlolpur",
      "Bhaddar",
      "Chak Manju",
      "Chakori Bhalowal",
      "Chakori Sher Ghazi",
      "Chechian",
      "Chhokar Kalan",
      "Chopala",
      "Deona Mandi",
      "Dinga",
      "Gochh",
      "Gujrat",
      "Haji Muhammad",
      "Jalalpur Jattan",
      "Jaura",
      "Kathala Chenab",
      "Kotla Arab Ali Khan",
      "Kotla Sarang Khan",
      "Kunjah",
      "Lala Musa",
      "Mandeer",
      "Miana Chak",
      "Mirza Tahir",
      "Noonanwali",
      "Panjan Kissana",
      "Pir Jand",
      "Sehna",
      "Sikaryali",
      "Thikrian",
      "Thutha Rai Bahadar"
    ]
  },
  {
    "name": "Hafizabad",
    "towns": [
      "Hafizabad",
      "Jalalpur Bhattian",
      "Pindi Bhattian",
      "Thatha Shamsa"
    ]
  },
  {
    "name": "Hangu",
    "towns": ["Hangu"]
  },
  {
    "name": "Haripur",
    "towns": ["Haripur"]
  },
  {
    "name": "Hyderabad",
    "towns": ["Hyderabad"]
  },
  {
    "name": "Islamabad",
    "towns": ["Islamabad", "Tarnol"]
  },
  {
    "name": "Jacobabad",
    "towns": ["Jacobabad", "Khairo"]
  },
  {
    "name": "Jaffarabad",
    "towns": ["Dera Allahyar"]
  },
  {
    "name": "Jamshoro",
    "towns": ["Jamshoro", "Sehwan Sharif"]
  },
  {
    "name": "Jhang",
    "towns": [
      "Ahmedpur Sial",
      "Athara Hazari",
      "Garh Maharaja",
      "Garh More",
      "Jhang",
      "Qaim Bharwana",
      "Ratta Matta",
      "Rodu Sultan",
      "Shorkot"
    ]
  },
  {
    "name": "Jhelum",
    "towns": [
      "Chak Jani",
      "Dina",
      "Jhelum",
      "Pind Dadan Khan",
      "Pindi Saidpur",
      "Sohawa"
    ]
  },
  {
    "name": "Kallar Syedan",
    "towns": ["Samote"]
  },
  {
    "name": "Karak",
    "towns": ["Karak"]
  },
  {
    "name": "Karachi",
    "towns": ["Karachi", "Mubarak Goth"]
  },
  {
    "name": "Kashmore",
    "towns": ["Kandhkot"]
  },
  {
    "name": "Kasur",
    "towns": [
      "Alpa Kalan",
      "Bazidpur",
      "Bhamba Kalan",
      "Bhedian Kalan",
      "Bhagiwal",
      "Bhoe Asal",
      "Changa Manga",
      "Chathian Wala",
      "Chunian",
      "Daftuh",
      "Deo Sial",
      "Fattiwala",
      "Gop-e-Rah",
      "Grinkot",
      "Halla",
      "Jajjal",
      "Jamber Khurd",
      "Jamsher Kalan",
      "Jamsher Khurd",
      "Kanganpur",
      "Khai Hithar",
      "Kasur",
      "Khudian",
      "Kot Radha Kishan",
      "Kot Rai Abubakar",
      "Kotha",
      "Mabboki",
      "Mudke Dhariwal",
      "Nathoki",
      "Orara",
      "Pattoki",
      "Phool Nagar",
      "Phulliani",
      "Pial Kalan",
      "Rafiq Villas",
      "Raja Jang",
      "Sikandar Pura",
      "Talwandi",
      "Usman Wala",
      "Wan Adhen",
      "Wan Khara",
      "Wan Radha Ram",
      "Zafarke"
    ]
  },
  {
    "name": "Kech",
    "towns": ["Turbat"]
  },
  {
    "name": "Khanewal",
    "towns": [
      "Abdul Hakeem",
      "Atari",
      "Faridkot",
      "Jamesabad",
      "Kabirwala",
      "Khanewal",
      "Mian Channu"
    ]
  },
  {
    "name": "Khushab",
    "towns": [
      "Hadali",
      "Jauharabad",
      "Jauharabad-I",
      "Jauharabad-II",
      "Khushab",
      "Noorpur"
    ]
  },
  {
    "name": "Khuzdar",
    "towns": ["Khuzdar"]
  },
  {
    "name": "Killa Abdullah",
    "towns": ["Chaman"]
  },
  {
    "name": "Kohlu",
    "towns": ["Kohlu"]
  },
  {
    "name": "Kotli",
    "towns": ["Kotli", "Ratta"]
  },
  {
    "name": "Kurram",
    "towns": ["Parachinar"]
  },
  {
    "name": "Lahore",
    "towns": [
      "Bilochwala",
      "Bismillapur",
      "Changa Manga",
      "Ghator",
      "Gobindsar",
      "Goughabad",
      "Gulzar",
      "Hari Singwala",
      "Khushipur",
      "Manak",
      "Miranpur",
      "Phadiara",
      "Pollard Kot",
      "Raiwind",
      "Rampur",
      "Roda",
      "Rurki",
      "Sahibnagar",
      "Saroi",
      "Singh Khalsa",
      "Targarh"
    ]
  },
  {
    "name": "Lakki Marwat",
    "towns": ["Lakki Marwat"]
  },
  {
    "name": "Larkana",
    "towns": ["Larkana"]
  },
  {
    "name": "Lasbela",
    "towns": ["Gadani", "Sonmiani", "Uthal"]
  },
  {
    "name": "Layyah",
    "towns": ["Chowk Azam", "Karor Lal Esan", "Mangewala"]
  },
  {
    "name": "Lodhran",
    "towns": ["Lodhran"]
  },
  {
    "name": "Lower Dir",
    "towns": ["Timergara"]
  },
  {
    "name": "Malakand",
    "towns": ["Malakand"]
  },
  {
    "name": "Mandi Bahauddin",
    "towns": [
      "Baddo",
      "Bhikhi",
      "Chakbasawa",
      "Chillianwala",
      "Chhimmon",
      "Kuthiala Sheikhan",
      "Malakwal",
      "Mandi Bahauddin",
      "Mangat",
      "Murala",
      "Pahrianwali",
      "Pindi Bahauddin",
      "Qadirabad",
      "Rasul",
      "Sahna",
      "Wara Alam Shah"
    ]
  },
  {
    "name": "Mansehra",
    "towns": ["Mansehra"]
  },
  {
    "name": "Mardan",
    "towns": ["Mardan"]
  },
  {
    "name": "Matiari",
    "towns": ["Matiari"]
  },
  {
    "name": "Mianwali",
    "towns": [
      "Daud Khel",
      "Hernoli",
      "Isakhel",
      "Kalabagh",
      "Kamar Mushani",
      "Kundian",
      "Mianwali",
      "Mochh",
      "Namal",
      "Paikhel",
      "Qureshian",
      "Rokhri",
      "Shadia",
      "Tanikhel",
      "Thamewali",
      "Tibba Mehrban Shah",
      "Tola Bhangi Khel",
      "Trag",
      "Vanjari",
      "Vichvin Bala",
      "Watta Khel",
      "Yaru Khel"
    ]
  },
  {
    "name": "Mirpur",
    "towns": ["Mirpur"]
  },
  {
    "name": "Mirpur Khas",
    "towns": ["Mirpur Khas"]
  },
  {
    "name": "Multan",
    "towns": [
      "Kumarwala",
      "Mehmood Kot",
      "Shah Rukan e Alam",
      "Sher Shah",
      "Shujabad"
    ]
  },
  {
    "name": "Murree",
    "towns": ["Murree"]
  },
  {
    "name": "Musakhel",
    "towns": ["Musakhel Bazar"]
  },
  {
    "name": "Muzaffargarh",
    "towns": [
      "Kot Addu",
      "Khar",
      "Qasba Gujrat",
      "Rohilanwali"
    ]
  },
  {
    "name": "Nankana Sahib",
    "towns": [
      "Bucheki",
      "Mangtanwala",
      "Nankana Sahib",
      "Sangla Hill",
      "Warburton"
    ]
  },
  {
    "name": "Narowal",
    "towns": [
      "Baddomalhi",
      "Qila Sobha Singh",
      "Shakargarh",
      "Zafarwal"
    ]
  },
  {
    "name": "Nasirabad",
    "towns": ["Dera Murad Jamali"]
  },
  {
    "name": "Naushahro Firoz",
    "towns": ["Naushahro Firoz"]
  },
  {
    "name": "Nowshera",
    "towns": ["Nowshera", "Risalpur"]
  },
  {
    "name": "Okara",
    "towns": [
      "Ahmadabad",
      "Burj Jeway Khan",
      "Dipalpur",
      "Gogera",
      "Haveli Lakha",
      "Hujra Shah Muqim",
      "Kaman",
      "Okara",
      "Renala Khurd",
      "Satgarah Okara"
    ]
  },
  {
    "name": "Pakpattan",
    "towns": [
      "Arifwala",
      "Bunga Hayat",
      "Faizpur",
      "Pakpattan"
    ]
  },
  {
    "name": "Panjgur",
    "towns": ["Panjgur"]
  },
  {
    "name": "Peshawar",
    "towns": ["Peshawar"]
  },
  {
    "name": "Pishin",
    "towns": ["Pishin"]
  },
  {
    "name": "Poonch",
    "towns": ["Rawalakot"]
  },
  {
    "name": "Qila Saifullah",
    "towns": ["Qila Saifullah"]
  },
  {
    "name": "Quetta",
    "towns": ["Quetta"]
  },
  {
    "name": "Rahim Yar Khan",
    "towns": [
      "Bangla Manthar",
      "Bhong",
      "Firoza",
      "Khanpur",
      "Liaqauatpur",
      "Rahim Yar Khan",
      "Sadiqabad",
      "Zahir Pir"
    ]
  },
  {
    "name": "Rajanpur",
    "towns": [
      "Dajal",
      "Jampur",
      "Mehraywala",
      "Mithankot",
      "Rajanpur",
      "Rasool Pur",
      "Rojhan"
    ]
  },
  {
    "name": "Rawalpindi",
    "towns": [
      "Chaklala",
      "Gujar Khan",
      "Kahuta",
      "Kallar Syedan",
      "Taxila",
      "Wah"
    ]
  },
  {
    "name": "Sahiwal",
    "towns": [
      "Agra",
      "Asghari",
      "Chichawatni",
      "Gulistan",
      "Qasimabad",
      "Sahiwal",
      "Sikhanwala",
      "Tirathpur"
    ]
  },
  {
    "name": "Sanghar",
    "towns": ["Sanghar"]
  },
  {
    "name": "Sargodha",
    "towns": [
      "Bhalwal",
      "Bhera",
      "Phularwan",
      "Shahpur",
      "Sillanwali"
    ]
  },
  {
    "name": "Shaheed Benazirabad",
    "towns": ["Nawabshah"]
  },
  {
    "name": "Shahdad Kot",
    "towns": ["Shahdad Kot"]
  },
  {
    "name": "Shangla",
    "towns": ["Alpuri"]
  },
  {
    "name": "Sheikhupura",
    "towns": [
      "Ferozewala",
      "Jandiala Sher Khan",
      "Mananwala",
      "Muridke",
      "Narang Mandi",
      "Safdarabad",
      "Sharaqpur"
    ]
  },
  {
    "name": "Shikarpur",
    "towns": ["Shikarpur"]
  },
  {
    "name": "Sialkot",
    "towns": [
      "Chawinda",
      "Daska",
      "Kotli Loharan East",
      "Pasrur",
      "Sadda",
      "Sambrial",
      "Sattoke",
      "Wadala Sandhuan"
    ]
  },
  {
    "name": "Sibi",
    "towns": ["Sibi"]
  },
  {
    "name": "Sujawal",
    "towns": ["Sujawal"]
  },
  {
    "name": "Sukkur",
    "towns": ["Sukkur"]
  },
  {
    "name": "Swabi",
    "towns": ["Swabi"]
  },
  {
    "name": "Swat",
    "towns": ["Matta", "Mingora", "Saidu Sharif"]
  },
  {
    "name": "Tando Allahyar",
    "towns": ["Tando Allahyar"]
  },
  {
    "name": "Tando Muhammad Khan",
    "towns": ["Tando Muhammad Khan"]
  },
  {
    "name": "Tank",
    "towns": ["Tank"]
  },
  {
    "name": "Thatta",
    "towns": ["Thatta"]
  },
  {
    "name": "Toba Tek Singh",
    "towns": [
      "Aligarh",
      "Gojra",
      "Kamalia",
      "Pir Mahal",
      "Toba Tek Singh"
    ]
  },
  {
    "name": "Upper Dir",
    "towns": ["Dir"]
  },
  {
    "name": "Upper Kohistan",
    "towns": ["Dasu"]
  },
  {
    "name": "Vehari",
    "towns": ["Burewala", "Mailsi"]
  },
  {
    "name": "Ziarat",
    "towns": ["Ziarat"]
  },
  {
    "name": "Zhob",
    "towns": ["Zhob"]
  }
];

connectDB();


async function seedCities() {
    try {
        await City.deleteMany(); // Clears old data
        const inserted = await City.insertMany(citiesData);
        console.log(`✅ Successfully inserted ${inserted.length} cities`);
    } catch (err) {
        console.error("❌ Error inserting cities:", err);
    } finally {
        mongoose.connection.close();
    }
}

seedCities();
