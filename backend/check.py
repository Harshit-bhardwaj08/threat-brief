import sqlite3

conn = sqlite3.connect('threatbrief.db')
cursor = conn.cursor()

# We use the correct column name found by your PRAGMA check
cursor.execute("SELECT cve_id FROM vulnerabilities WHERE raw_description LIKE '%AI%' OR raw_description LIKE '%ML%'")
results = cursor.fetchall()

print(f"Total AI/ML threats found in DB: {len(results)}")
for r in results:
    print(f"Match found in: {r[0]}")

conn.close()