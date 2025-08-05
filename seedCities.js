const mongoose = require("mongoose");
const City = require("./models/city"); // Assuming you have a City model defined
const connectDB = require('./config/db');

const citiesData = [
  {
    "name": "Abbottabad",
    "towns": ["Noor Mang", "Havelian", "Bagnotar", "Nathia Gali", "Thandiani"]
  },
  {
    "name": "Astore",
    "towns": ["Rupal", "Eidghah", "Chilm", "Bubin", "Shonter"]
  },
  {
    "name": "Athmuqam",
    "towns": ["Athmuqam", "Neelum Valley", "Sharda", "Kel", "Dawar"]
  },
  {
    "name": "Attock",
    "towns": ["Fateh Jang", "Jand", "Lawrencepur", "Hazro", "Pindigheb", "Attock City"]
  },
  {
    "name": "Awaran",
    "towns": ["Awaran", "Jhao", "Gishkaur", "Mashkay", "Gajjar"]
  },
  {
    "name": "Azad Kashmir",
    "towns": ["Muzaffarabad", "Bagh", "Bhimber", "Kotli", "Mirpur", "Rawalakot"]
  },
  {
    "name": "Badin",
    "towns": ["Badin", "Golarchi", "Talhar", "Tando Bago", "Shaheed Fazil Rahu"]
  },
  {
    "name": "Bagh",
    "towns": ["Bagh", "Dhariyaal", "Hari Ghel", "Kahuta", "Mang"]
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
      "Yazman",
      "Hasilpur",
      "Uch Sharif"
    ]
  },
  {
    "name": "Bannu",
    "towns": ["Bannu", "Domel", "Kakki", "Meri", "Siri Kach"]
  },
  {
    "name": "Barkhan",
    "towns": ["Barkhan", "Chamalang", "Fatehpur", "Rakhni", "Usta Muhammad"]
  },
  {
    "name": "Battagram",
    "towns": ["Battagram", "Allai", "Banna", "Kukmang", "Shamlai"]
  },
  {
    "name": "Bhakkar",
    "towns": [
      "Darya Khan",
      "Kallurkot",
      "Notak",
      "Notak Bhakkar",
      "Mankera",
      "Dullaywala"
    ]
  },
  {
    "name": "Buner",
    "towns": ["Dadu", "Gagra", "Chagharzai", "Khudu Khel", "Totalai"]
  },
  {
    "name": "Chaghi",
    "towns": ["Dalbandin", "Nokkundi", "Taftan", "Ziarat", "Saindak"]
  },
  {
    "name": "Chakwal",
    "towns": [
      "Chakwal",
      "Choa Saidan Shah",
      "Dhurnal",
      "Jabairpur",
      "Kallar Kahar",
      "Lawah"
    ]
  },
  {
    "name": "Charsadda",
    "towns": ["Charsadda", "Shabqadar", "Tangi", "Umerzai", "Rajjar"]
  },
  {
    "name": "Chiniot",
    "towns": [
      "Chiniot",
      "Hast Khewa",
      "Lalian",
      "Rabwah",
      "Bhawana",
      "Mughalabad"
    ]
  },
  {
    "name": "Chitral",
    "towns": ["Chitral", "Booni", "Drosh", "Garam Chashma", "Mastuj"]
  },
  {
    "name": "Dera Bugti",
    "towns": ["Sui", "Pirkoh", "Loti", "Dera Bugti Town", "Pharsat"]
  },
  {
    "name": "Dera Ghazi Khan",
    "towns": [
      "Dera Ghazi Khan",
      "Taunsa Sharif",
      "Kot Chutta",
      "Jampur",
      "Tribal Area"
    ]
  },
  {
    "name": "Dera Ismail Khan",
    "towns": ["Dera Ismail Khan", "Kulachi", "Paharpur", "Paroa", "Daraban"]
  },
  {
    "name": "Faisalabad",
    "towns": [
      "Faisalabad City",
      "Jaranwala",
      "Samundri",
      "Tandlianwala",
      "Chak Jhumra",
      "Lyallpur Town"
    ]
  },
  {
    "name": "Gwadar",
    "towns": ["Gwadar", "Ormara", "Pasni", "Jiwani", "Pishukan"]
  },
  {
    "name": "Gilgit-Baltistan",
    "towns": ["Gilgit", "Skardu", "Chilas", "Gahkuch", "Dainyor", "Khaplu"]
  },
  {
    "name": "Ghotki",
    "towns": ["Ghotki", "Daharki", "Khangarh", "Mirpur Mathelo", "Ubauro"]
  },
  {
    "name": "Gujranwala",
    "towns": [
      "Gujranwala City",
      "Kamoke",
      "Nowshera Virkan",
      "Qila Didar Singh",
      "Wazirabad"
    ]
  },
  {
    "name": "Gujrat",
    "towns": [
      "Gujrat",
      "Kharian",
      "Sarai Alamgir",
      "Dinga",
      "Jalalpur Jattan",
      "Lalamusa"
    ]
  },
  {
    "name": "Hafizabad",
    "towns": ["Hafizabad", "Jalalpur Bhattian", "Pindi Bhattian", "Sukheke"]
  },
  {
    "name": "Hangu",
    "towns": ["Hangu", "Tall", "Thall", "Doaba", "Zarobi"]
  },
  {
    "name": "Haripur",
    "towns": ["Haripur", "Khanpur", "Ghazi", "Hattar", "Sherwan"]
  },
  {
    "name": "Hyderabad",
    "towns": ["Hyderabad City", "Latifabad", "Qasimabad", "Hussainabad", "Kotri"]
  },
  {
    "name": "Islamabad",
    "towns": [
      "Islamabad City",
      "Tarnol",
      "Bhara Kahu",
      "Golra Sharif",
      "Rawal Town",
      "Margalla Town"
    ]
  },
  {
    "name": "Jacobabad",
    "towns": ["Jacobabad", "Khairo", "Garhi Khairo", "Thul", "Kandhkot"]
  },
  {
    "name": "Jaffarabad",
    "towns": ["Dera Allahyar", "Gandakha", "Usta Muhammad", "Sohbatpur", "Bhag"]
  },
  {
    "name": "Jamshoro",
    "towns": ["Jamshoro", "Sehwan Sharif", "Kotri", "Manjhand", "Thano Bula Khan"]
  },
  {
    "name": "Jhang",
    "towns": [
      "Jhang",
      "Shorkot",
      "Ahmedpur Sial",
      "Athara Hazari",
      "18-Hazari",
      "Garh More"
    ]
  },
  {
    "name": "Jhelum",
    "towns": [
      "Jhelum",
      "Pind Dadan Khan",
      "Sohawa",
      "Dina",
      "Kala Gujran",
      "Sarai Alamgir"
    ]
  },
  {
    "name": "Kallar Syedan",
    "towns": ["Samote", "Kallar Syedan", "Doberan Kallan", "Nara", "Trar"]
  },
  {
    "name": "Karak",
    "towns": ["Karak", "Banda Daud Shah", "Takht-e-Nasrati", "Gambat", "Latamber"]
  },
  {
    "name": "Karachi",
    "towns": [
      "Karachi Central",
      "Karachi East",
      "Karachi South",
      "Karachi West",
      "Malir",
      "Korangi",
      "Gulshan-e-Iqbal",
      "North Nazimabad"
    ]
  },
  {
    "name": "Kashmore",
    "towns": ["Kandhkot", "Kashmore", "Tangwani", "Guddu", "Ghouspur"]
  },
  {
    "name": "Kasur",
    "towns": [
      "Kasur",
      "Pattoki",
      "Chunian",
      "Kot Radha Kishan",
      "Phool Nagar",
      "Bhaini"
    ]
  },
  {
    "name": "Kech",
    "towns": ["Turbat", "Buleda", "Dasht", "Mand", "Tump", "Zamuran"]
  },
  {
    "name": "Khanewal",
    "towns": [
      "Khanewal",
      "Kabirwala",
      "Mian Channu",
      "Jahanian",
      "Tulamba",
      "Abdul Hakeem"
    ]
  },
  {
    "name": "Khushab",
    "towns": ["Khushab", "Noorpur", "Quaidabad", "Hadali", "Jauharabad"]
  },
  {
    "name": "Khuzdar",
    "towns": ["Khuzdar", "Wadh", "Moola", "Zeeri", "Nal", "Saruna"]
  },
  {
    "name": "Killa Abdullah",
    "towns": ["Chaman", "Dobandi", "Gulistan", "Killi Appozai", "Killi Jahangir"]
  },
  {
    "name": "Kohlu",
    "towns": ["Kohlu", "Mawand", "Kahan", "Fazil Chel", "Tamar"]
  },
  {
    "name": "Kotli",
    "towns": ["Kotli", "Ratta", "Sehnsa", "Khuiratta", "Fatehpur Thakiala"]
  },
  {
    "name": "Kurram",
    "towns": ["Parachinar", "Alizai", "Central Kurram", "Lower Kurram", "Upper Kurram"]
  },
  {
    "name": "Lahore",
    "towns": [
      "Lahore City",
      "Raiwind",
      "Shahdara",
      "Wagah",
      "Model Town",
      "Cantonment",
      "Iqbal Town"
    ]
  },
  {
    "name": "Lakki Marwat",
    "towns": ["Lakki Marwat", "Naurang", "Dadiwala", "Tajori", "Sarae Gambila"]
  },
  {
    "name": "Larkana",
    "towns": ["Larkana", "Ratodero", "Dokri", "Bakrani", "Miro Khan"]
  },
  {
    "name": "Lasbela",
    "towns": ["Uthal", "Bela", "Dureji", "Hub", "Kanraj", "Lakhra"]
  },
  {
    "name": "Layyah",
    "towns": ["Layyah", "Chowk Azam", "Karor Lal Esan", "Chaubara", "Fatehpur"]
  },
  {
    "name": "Lodhran",
    "towns": ["Lodhran", "Kahror Pakka", "Dunyapur", "Kehror Pacca", "Basti Maluk"]
  },
  {
    "name": "Lower Dir",
    "towns": ["Timergara", "Adenzai", "Lal Qila", "Munda", "Samarbagh", "Talash"]
  },
  {
    "name": "Malakand",
    "towns": ["Malakand", "Dargai", "Batkhela", "Chakdara", "Swat Ranizai"]
  },
  {
    "name": "Mandi Bahauddin",
    "towns": [
      "Mandi Bahauddin",
      "Phalia",
      "Malakwal",
      "Chillianwala",
      "Kuthiala Sheikhan"
    ]
  },
  {
    "name": "Mansehra",
    "towns": ["Mansehra", "Baffa", "Oghi", "Balakot", "Shinkiari", "Dadar"]
  },
  {
    "name": "Mardan",
    "towns": ["Mardan", "Takht Bhai", "Katlang", "Rustam", "Shergarh"]
  },
  {
    "name": "Matiari",
    "towns": ["Matiari", "Hala", "Saeedabad", "Shahdadpur", "New Saeedabad"]
  },
  {
    "name": "Mianwali",
    "towns": [
      "Mianwali",
      "Isakhel",
      "Kundian",
      "Kalabagh",
      "Piplan",
      "Daud Khel"
    ]
  },
  {
    "name": "Mirpur",
    "towns": ["Mirpur", "Dadyal", "Islamgarh", "Chaksawari", "Khari Sharif"]
  },
  {
    "name": "Mirpur Khas",
    "towns": ["Mirpur Khas", "Digri", "Kot Ghulam Muhammad", "Jhuddo", "Sindhri"]
  },
  {
    "name": "Multan",
    "towns": [
      "Multan City",
      "Shujabad",
      "Jalalpur Pirwala",
      "Lodhran",
      "Khanewal",
      "Muzaffargarh"
    ]
  },
  {
    "name": "Murree",
    "towns": ["Murree", "Ghora Gali", "Kuldana", "Nathia Gali", "Patriata"]
  },
  {
    "name": "Musakhel",
    "towns": ["Musakhel Bazar", "Kingri", "Drazinda", "Vehova", "Mithri"]
  },
  {
    "name": "Muzaffargarh",
    "towns": [
      "Muzaffargarh",
      "Kot Addu",
      "Alipur",
      "Jatoi",
      "Mehmood Kot",
      "Sinawan"
    ]
  },
  {
    "name": "Nankana Sahib",
    "towns": [
      "Nankana Sahib",
      "Sangla Hill",
      "Shahkot",
      "Warburton",
      "Safarwala"
    ]
  },
  {
    "name": "Narowal",
    "towns": ["Narowal", "Shakargarh", "Zafarwal", "Baddomalhi", "Bara Manga"]
  },
  {
    "name": "Nasirabad",
    "towns": ["Dera Murad Jamali", "Tamboo", "Chattar", "Dera Allah Yar", "Khanpur"]
  },
  {
    "name": "Naushahro Firoz",
    "towns": ["Naushahro Firoz", "Moro", "Bhiria", "Kandiaro", "Mehrabpur"]
  },
  {
    "name": "Nowshera",
    "towns": ["Nowshera", "Pabbi", "Jehangira", "Risalpur", "Akora Khattak"]
  },
  {
    "name": "Okara",
    "towns": [
      "Okara",
      "Renala Khurd",
      "Depalpur",
      "Haveli Lakha",
      "Basirpur",
      "Dipalpur"
    ]
  },
  {
    "name": "Pakpattan",
    "towns": ["Pakpattan", "Arifwala", "Bhakkar", "Haroonabad", "Minchinabad"]
  },
  {
    "name": "Panjgur",
    "towns": ["Panjgur", "Gichk", "Paroom", "Nokjo", "Gowargo"]
  },
  {
    "name": "Peshawar",
    "towns": [
      "Peshawar City",
      "Charsadda",
      "Nowshera",
      "Mardan",
      "Swabi",
      "Charbagh"
    ]
  },
  {
    "name": "Pishin",
    "towns": ["Pishin", "Karezat", "Barshore", "Huramzai", "Saranan"]
  },
  {
    "name": "Poonch",
    "towns": ["Rawalakot", "Hajira", "Abbaspur", "Banjosa", "Thorar"]
  },
  {
    "name": "Qila Saifullah",
    "towns": ["Qila Saifullah", "Muslim Bagh", "Kan Mehtarzai", "Khost", "Sharana"]
  },
  {
    "name": "Quetta",
    "towns": [
      "Quetta City",
      "Hanna Valley",
      "Kuchlak",
      "Ziarat",
      "Chiltan",
      "Brewery"
    ]
  },
  {
    "name": "Rahim Yar Khan",
    "towns": [
      "Rahim Yar Khan",
      "Sadiqabad",
      "Khanpur",
      "Liaquatpur",
      "Zahir Pir",
      "Alipur"
    ]
  },
  {
    "name": "Rajanpur",
    "towns": ["Rajanpur", "Jampur", "Rojhan", "Dajal", "Harrand", "Mithankot"]
  },
  {
    "name": "Rawalpindi",
    "towns": [
      "Rawalpindi City",
      "Taxila",
      "Gujar Khan",
      "Kahuta",
      "Kallar Syedan",
      "Murree"
    ]
  },
  {
    "name": "Sahiwal",
    "towns": ["Sahiwal", "Chichawatni", "Harappa", "Yousafwala", "Qadirabad"]
  },
  {
    "name": "Sanghar",
    "towns": ["Sanghar", "Shahdadpur", "Tando Adam", "Jam Nawaz Ali", "Sinjhoro"]
  },
  {
    "name": "Sargodha",
    "towns": ["Sargodha", "Bhalwal", "Bhera", "Sillanwali", "Sahiwal", "Shahpur"]
  },
  {
    "name": "Shaheed Benazirabad",
    "towns": ["Nawabshah", "Sakrand", "Daulatpur", "Daur", "Kazi Ahmed"]
  },
  {
    "name": "Shahdad Kot",
    "towns": ["Shahdad Kot", "Miro Khan", "Qubo Saeed Khan", "Sijawal", "Warah"]
  },
  {
    "name": "Shangla",
    "towns": ["Alpuri", "Besham", "Chakesar", "Martung", "Purian"]
  },
  {
    "name": "Sheikhupura",
    "towns": [
      "Sheikhupura",
      "Ferozewala",
      "Muridke",
      "Sharaqpur",
      "Hafizabad",
      "Nankana Sahib"
    ]
  },
  {
    "name": "Shikarpur",
    "towns": ["Shikarpur", "Khanpur", "Lakhi", "Garhi Yasin", "Daro"]
  },
  {
    "name": "Sialkot",
    "towns": [
      "Sialkot",
      "Daska",
      "Pasrur",
      "Sambrial",
      "Zafarwal",
      "Chawinda"
    ]
  },
  {
    "name": "Sibi",
    "towns": ["Sibi", "Lehri", "Kohlu", "Ziarat", "Harnai", "Sanjawi"]
  },
  {
    "name": "Sujawal",
    "towns": ["Sujawal", "Jati", "Shah Bunder", "Kharo Chan", "Mirpur Bathoro"]
  },
  {
    "name": "Sukkur",
    "towns": ["Sukkur", "Rohri", "Pano Aqil", "Saleh Pat", "Kandhra"]
  },
  {
    "name": "Swabi",
    "towns": ["Swabi", "Topi", "Lahor", "Zaida", "Kalu Khan", "Marghuz"]
  },
  {
    "name": "Swat",
    "towns": ["Mingora", "Saidu Sharif", "Matta", "Khwazakhela", "Barikot"]
  },
  {
    "name": "Tando Allahyar",
    "towns": ["Tando Allahyar", "Chambar", "Jhando Mari", "Jhudo", "Daharki"]
  },
  {
    "name": "Tando Muhammad Khan",
    "towns": ["Tando Muhammad Khan", "Bulri Shah Karim", "Jhirk", "Shahpur", "Khipro"]
  },
  {
    "name": "Tank",
    "towns": ["Tank", "Jandola", "Gomal", "Kot Azam", "Razmak"]
  },
  {
    "name": "Thatta",
    "towns": ["Thatta", "Mirpur Sakro", "Jati", "Kharo Chan", "Ghorabari"]
  },
  {
    "name": "Toba Tek Singh",
    "towns": ["Toba Tek Singh", "Gojra", "Kamalia", "Pir Mahal", "Dinga"]
  },
  {
    "name": "Upper Dir",
    "towns": ["Dir", "Wari", "Kumrat", "Kalkot", "Shahikot"]
  },
  {
    "name": "Upper Kohistan",
    "towns": ["Dasu", "Kandia", "Pattan", "Keyal", "Jijal"]
  },
  {
    "name": "Vehari",
    "towns": ["Vehari", "Burewala", "Mailsi", "Gaggo Mandi", "Karampur"]
  },
  {
    "name": "Ziarat",
    "towns": ["Ziarat", "Sanjawi", "Harnai", "Khost", "Sinjawi"]
  },
  {
    "name": "Zhob",
    "towns": ["Zhob", "Qamar Din Karez", "Sambaza", "Shinghar", "Ashwat"]
  }
]

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
