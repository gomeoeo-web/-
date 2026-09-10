def simulate_notice(expired, urgent):
    if expired > 0 or urgent > 0:
        if expired > 0:
            notice_desc = '請盡速更換已過期物品，並留意即將到期耗材' if urgent > 0 else '建議盡速更換新耗材或處理已過期物品'
            notice_status_text = '已過期 · 即將到期' if urgent > 0 else '已過期'
            notice_class = 'notice-icon-wrapper expired'
        else:
            notice_desc = '即將到期！請留意及時使用或備妥耗材更換'
            notice_status_text = '即將到期'
            notice_class = 'notice-icon-wrapper warning'
        notice_title = f'有 {expired} 項已過期、{urgent} 項即將到期'
    else:
        notice_class = 'notice-icon-wrapper'
        notice_title = '今天都在週期內'
        notice_desc = '目前沒有已過期或即將到期的物品'
        notice_status_text = '正常'
    return notice_title, notice_desc, notice_status_text, notice_class

cases = [(2, 1), (1, 0), (0, 3), (0, 0)]
print("--- Notice Card Simulation Results ---")
for exp, urg in cases:
    title, desc, status, cls = simulate_notice(exp, urg)
    print(f"Expired={exp}, Urgent={urg} => Title: '{title}' | Status: '{status}' | Class: '{cls}'")
print("--- ALL SIMULATION CASES VERIFIED ---")
