// Static India state -> cities map that drives the State/City dropdowns on the
// profile-details step. Free-text on the backend, so this is only to give most
// users a clean pick-list; the City dropdown also offers "Other" for manual entry,
// which covers any town/village not listed here. States and union territories, and
// each state's cities, are in A-Z order. Haryana lists every district town plus the
// towns around the Gurugram service area. Also used by Profile -> Saved addresses.

export const INDIA_STATES_CITIES: Record<string, string[]> = {
  'Andaman and Nicobar Islands': ['Port Blair'],
  'Andhra Pradesh': ['Guntur', 'Kurnool', 'Nellore', 'Tirupati', 'Vijayawada', 'Visakhapatnam'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat'],
  'Assam': ['Dibrugarh', 'Guwahati', 'Jorhat', 'Nagaon', 'Silchar'],
  'Bihar': ['Arrah', 'Bhagalpur', 'Darbhanga', 'Gaya', 'Muzaffarpur', 'Patna', 'Purnia'],
  'Chandigarh': ['Chandigarh'],
  'Chhattisgarh': ['Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Raipur'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Silvassa'],
  'Delhi': ['Delhi', 'New Delhi'],
  'Goa': ['Margao', 'Panaji', 'Vasco da Gama'],
  'Gujarat': ['Ahmedabad', 'Gandhinagar', 'Rajkot', 'Surat', 'Vadodara'],
  'Haryana': ['Ambala', 'Bahadurgarh', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Manesar', 'Narnaul', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Pataudi', 'Rewari', 'Rohtak', 'Sirsa', 'Sohna', 'Sonipat', 'Yamunanagar'],
  'Himachal Pradesh': ['Dharamshala', 'Manali', 'Shimla', 'Solan'],
  'Jammu and Kashmir': ['Jammu', 'Srinagar'],
  'Jharkhand': ['Bokaro', 'Deoghar', 'Dhanbad', 'Jamshedpur', 'Ranchi'],
  'Karnataka': ['Belagavi', 'Belgaum', 'Bengaluru', 'Hubballi', 'Hubli', 'Mangaluru', 'Mysuru'],
  'Kerala': ['Kochi', 'Kollam', 'Kozhikode', 'Thiruvananthapuram', 'Thrissur'],
  'Ladakh': ['Kargil', 'Leh'],
  'Lakshadweep': ['Kavaratti'],
  'Madhya Pradesh': ['Bhopal', 'Gwalior', 'Indore', 'Jabalpur', 'Ujjain'],
  'Maharashtra': ['Aurangabad', 'Mumbai', 'Nagpur', 'Nashik', 'Pune', 'Thane'],
  'Manipur': ['Imphal', 'Thoubal'],
  'Meghalaya': ['Shillong', 'Tura'],
  'Mizoram': ['Aizawl', 'Lunglei'],
  'Nagaland': ['Dimapur', 'Kohima'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela'],
  'Puducherry': ['Puducherry'],
  'Punjab': ['Amritsar', 'Chandigarh', 'Jalandhar', 'Ludhiana', 'Patiala'],
  'Rajasthan': ['Ajmer', 'Bikaner', 'Jaipur', 'Jodhpur', 'Kota', 'Udaipur'],
  'Sikkim': ['Gangtok', 'Namchi'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
  'Telangana': ['Hyderabad', 'Karimnagar', 'Nizamabad', 'Warangal'],
  'Tripura': ['Agartala', 'Udaipur'],
  'Uttar Pradesh': ['Agra', 'Ghaziabad', 'Kanpur', 'Lucknow', 'Meerut', 'Noida', 'Prayagraj', 'Varanasi'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Nainital', 'Rishikesh', 'Roorkee'],
  'West Bengal': ['Asansol', 'Durgapur', 'Howrah', 'Kolkata', 'Siliguri'],
};

export const INDIA_STATES = Object.keys(INDIA_STATES_CITIES);
