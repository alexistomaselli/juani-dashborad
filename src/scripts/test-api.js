async function checkApi() {
  try {
    const res = await fetch('http://localhost:3000/api/orders');
    const data = await res.json();
    console.log('Sample order from API:', JSON.stringify(data[0], null, 2));
  } catch (e) {
    console.error('Error fetching from API:', e.message);
  }
}

checkApi();
