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
    'scratch/test_rename_and_version.py',
    'scratch/test_group_remove_and_reminder_switch.py',
    'scratch/test_v15_features.py',
    'scratch/test_v152_layout_and_cleanup.py',
    'scratch/test_v153_dock_and_sheet_gestures.py',
    'scratch/test_v154_dock_effects_and_swipe_top.py',
    'scratch/test_v155_close_animations.py',
    'scratch/test_v156_dock_label_and_pre_swipe_top.py',
    'scratch/test_v157_current_page_retain_next_top.py',
    'scratch/test_v158_border_distance_and_click_dock_pulse.py',
    'scratch/test_v159_light_mode_dock_colors.py',
    'scratch/test_v160_settings_modal_scroll.py',
    'scratch/test_v161_settings_scroll_no_overlap.py',
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
            if res.stdout:
                sys.stdout.buffer.write((res.stdout + '\n').encode('utf-8', errors='replace'))
            if res.stderr:
                sys.stderr.buffer.write((res.stderr + '\n').encode('utf-8', errors='replace'))
            all_passed = False

if all_passed:
    print("\nALL TEST SUITES PASSED SUCCESSFULLY!")
    sys.exit(0)
else:
    print("\nSOME TESTS FAILED!")
    sys.exit(1)
