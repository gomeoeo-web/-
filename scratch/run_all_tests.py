import subprocess
import glob
import os
import sys

tests = [
    'scratch/verify_all.py',
    'scratch/test_notice_rwd.py',
    'scratch/test_slider_edge_and_notice.py',
    'scratch/test_urgent_expired_oled.py',
    'scratch/test_notice_sort_colors.py',
    'scratch/test_3days_and_clean_menus.py',
    'scratch/test_android_and_trash.py',
    'scratch/test_left_align_and_notice.py',
    'scratch/test_single_milk_sample.py',
    'scratch/test_session_requirements.py',
    'scratch/test_archive_feature.py',
    'scratch/test_oled_frames_version.py',
    'scratch/find_parens.py'
]

all_passed = True
for t in tests:
    if os.path.exists(t):
        res = subprocess.run([sys.executable, t], capture_output=True, text=True, encoding='utf-8', errors='replace')
        if res.returncode == 0:
            print(f"[PASS] {t}")
        else:
            print(f"[FAIL] {t} (exit {res.returncode}):")
            print(res.stdout)
            print(res.stderr)
            all_passed = False

if all_passed:
    print("\nALL TEST SUITES PASSED SUCCESSFULLY!")
    sys.exit(0)
else:
    print("\nSOME TESTS FAILED!")
    sys.exit(1)
