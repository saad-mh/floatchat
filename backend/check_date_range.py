#!/usr/bin/env python3
"""
Check the date range of data in the database
"""
import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Astronomical Julian Date conversion
# JD 2440588 = 1970-01-01 00:00:00 UTC
UNIX_EPOCH_JD = 2440588.0

def jd_to_datetime(jd):
    """Convert astronomical Julian Date to datetime"""
    days_from_epoch = jd - UNIX_EPOCH_JD
    return datetime(1970, 1, 1) + timedelta(days=days_from_epoch)

print("=" * 60)
print("DATABASE DATE RANGE ANALYSIS")
print("=" * 60)

# Query float_locations to get min and max juld values
print("\n📅 Querying float_locations for date range...")
result = supabase.table('float_locations').select('juld').not_.is_('juld', 'null').order('juld', desc=False).limit(1).execute()

if not result.data:
    print("❌ No data found")
    sys.exit(1)

min_juld = result.data[0]['juld']
print(f"✅ Minimum Julian date: {min_juld}")
min_date = jd_to_datetime(min_juld)
print(f"   → {min_date.strftime('%Y-%m-%d')} ({min_date.strftime('%B %Y')})")

# Get max date
result = supabase.table('float_locations').select('juld').not_.is_('juld', 'null').order('juld', desc=True).limit(1).execute()

if result.data:
    max_juld = result.data[0]['juld']
    print(f"\n✅ Maximum Julian date: {max_juld}")
    max_date = jd_to_datetime(max_juld)
    print(f"   → {max_date.strftime('%Y-%m-%d')} ({max_date.strftime('%B %Y')})")

print(f"\n📊 DATA RANGE SUMMARY")
print(f"   From: {min_date.strftime('%B %d, %Y')}")
print(f"   To:   {max_date.strftime('%B %d, %Y')}")
print(f"   Duration: {(max_date - min_date).days} days ({(max_date - min_date).days / 365.25:.1f} years)")

# Count total locations
print("\n📍 Counting total locations...")
result = supabase.table('float_locations').select('*', count='exact').limit(1).execute()
print(f"✅ Total location records: {result.count:,}")

# Count unique floats
print("\n🎯 Counting unique floats...")
result = supabase.table('floats').select('float_id', count='exact').limit(1).execute()
print(f"✅ Total unique floats: {result.count:,}")

# Sample some dates to show distribution
print("\n📅 Sample dates in database (earliest):")
result = supabase.table('float_locations').select('juld, float_id, latitude, longitude').not_.is_('juld', 'null').order('juld', desc=False).limit(5).execute()

for i, loc in enumerate(result.data, 1):
    date = jd_to_datetime(loc['juld'])
    print(f"   {i}. {date.strftime('%Y-%m-%d')} - Float {loc['float_id']} at ({loc['latitude']:.2f}, {loc['longitude']:.2f})")

print("\n📅 Sample dates in database (latest):")
result = supabase.table('float_locations').select('juld, float_id, latitude, longitude').not_.is_('juld', 'null').order('juld', desc=True).limit(5).execute()

for i, loc in enumerate(result.data, 1):
    date = jd_to_datetime(loc['juld'])
    print(f"   {i}. {date.strftime('%Y-%m-%d')} - Float {loc['float_id']} at ({loc['latitude']:.2f}, {loc['longitude']:.2f})")

# Check data by year
print("\n📊 Data distribution by year:")
years_to_check = [2000, 2005, 2010, 2015, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
for year in years_to_check:
    year_start = datetime(year, 1, 1)
    year_end = datetime(year + 1, 1, 1)
    julian_start = UNIX_EPOCH_JD + (year_start - datetime(1970, 1, 1)).days
    julian_end = UNIX_EPOCH_JD + (year_end - datetime(1970, 1, 1)).days
    
    result = supabase.table('float_locations').select('*', count='exact').gte('juld', julian_start).lt('juld', julian_end).limit(1).execute()
    if result.count > 0:
        print(f"   {year}: {result.count:,} records ✅")
    else:
        print(f"   {year}: 0 records ❌")

print("\n" + "=" * 60)
print("RECOMMENDATION FOR QUERIES:")
print("=" * 60)
print(f"\nYour data spans from {min_date.strftime('%B %Y')} to {max_date.strftime('%B %Y')}")
print("\nExample queries that will work:")
print(f'  ✅ "Show salinity in {min_date.strftime("%B %Y")}"')
print(f'  ✅ "Show floats in {max_date.strftime("%Y")}"')
print('  ✅ "Show me all salinity data" (no date filter)')
print('  ✅ "Show temperature near the equator"')
print("\n" + "=" * 60)
