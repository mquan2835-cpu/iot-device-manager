import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Polygon, Circle
plt.rcParams['font.family'] = 'DejaVu Sans'
# python3 draw_wiring.py            -> NodeMCU ESP8266 (b2_wiring.png)
# python3 draw_wiring.py c3         -> ESP32-C3 Super Mini (b2_wiring_c3.png)
C3 = len(sys.argv) > 1 and sys.argv[1] == 'c3'
P_LIGHT, P_FAN, P_AC, P_DHT = (('GPIO5', 'GPIO6', 'GPIO7', 'GPIO10') if C3 else ('D1 (GPIO5)', 'D2 (GPIO4)', 'D5 (GPIO14)', 'D7 (GPIO13)'))
BOARD = 'ESP32-C3 Super Mini' if C3 else 'NodeMCU ESP8266'
CHIP = 'ESP32-\nC3' if C3 else 'ESP-\n12E'
USB = 'USB-C' if C3 else 'micro-USB'
OUT = 'b2_wiring_c3.png' if C3 else 'b2_wiring.png'
fig, ax = plt.subplots(figsize=(12, 7.2), dpi=200)
ax.set_xlim(0, 120); ax.set_ylim(-1, 72); ax.axis('off')
BLUE='#1D4ED8'; RED='#DC2626'; GRAY='#334155'; GREEN='#15803D'; ORANGE='#C2410C'

# NodeMCU board
ax.add_patch(FancyBboxPatch((4, 8), 26, 59, boxstyle='round,pad=0.6', fc='#E0F2FE', ec=BLUE, lw=2))
ax.text(17, 66.5, BOARD, ha='center', va='top', fontsize=12, weight='bold', color=BLUE)
ax.add_patch(Rectangle((6, 34), 8, 14, fc='#CBD5E1', ec=GRAY)); ax.text(10, 41, CHIP, ha='center', va='center', fontsize=8)
ax.add_patch(Rectangle((13, 9), 8, 4, fc='#94A3B8', ec=GRAY)); ax.text(17, 14.5, USB, ha='center', fontsize=7.5)

pins = {P_LIGHT:58, P_FAN:50, P_AC:42, P_DHT:32, '3V3':26, 'GND':14}
for name, y in pins.items():
    ax.plot([30, 33], [y, y], color=GRAY, lw=2)
    ax.add_patch(Circle((30, y), 0.7, color=GRAY))
    ax.text(29, y, name, ha='right', va='center', fontsize=8.5, color=GRAY)

GND_X = 112
# GND rail
ax.plot([GND_X, GND_X], [5.5, 62], color='black', lw=2.5)
ax.text(GND_X, 64, 'GND', ha='center', fontsize=10, weight='bold')
ax.plot([33, 40, 40, GND_X], [14, 14, 5.5, 5.5], color='black', lw=2)

def resistor(x, y, label):
    pts = []
    w = 8; n = 6
    for i in range(n + 1):
        pts.append((x + i * w / n, y + (1.2 if i % 2 else -1.2) if 0 < i < n else y))
    xs, ys = zip(*pts); ax.plot(xs, ys, color=GRAY, lw=1.8)
    ax.text(x + w / 2, y + 2.2, label, ha='center', fontsize=8.5, color=GRAY)

def led(x, y, color, label):
    ax.add_patch(Polygon([(x, y - 2), (x, y + 2), (x + 3.4, y)], closed=True, fc=color, ec='black'))
    ax.plot([x + 3.4, x + 3.4], [y - 2, y + 2], color='black', lw=2)
    ax.annotate('', xy=(x + 4.5, y + 4), xytext=(x + 2.5, y + 2.2), arrowprops=dict(arrowstyle='->', color=color))
    ax.text(x + 7, y + 1.0, label, ha='left', fontsize=9, color=color, weight='bold')

leds = [(P_LIGHT, '#F59E0B', 'LED "Đèn"'), (P_FAN, '#10B981', 'LED "Quạt"'), (P_AC, '#3B82F6', 'LED "Điều hòa"')]
for pin, color, label in leds:
    y = pins[pin]
    ax.plot([33, 50], [y, y], color=ORANGE, lw=1.8)
    resistor(50, y, '220Ω')
    ax.plot([58, 66], [y, y], color=ORANGE, lw=1.8)
    led(66, y, color, label)
    ax.text(64.5, y + 2.6, 'A', fontsize=7, color=GRAY); ax.text(70.6, y + 2.6, 'K', fontsize=7, color=GRAY)
    ax.plot([69.4, GND_X], [y, y], color='black', lw=1.5)

# DHT11 module (chân ở cạnh trên)
ax.add_patch(FancyBboxPatch((76, 9), 18, 15, boxstyle='round,pad=0.4', fc='#DBEAFE', ec=BLUE, lw=1.8))
ax.text(85, 15.5, 'DHT11', ha='center', fontsize=11, weight='bold', color=BLUE)
ax.text(85, 11.5, 'nhiệt độ + độ ẩm', ha='center', fontsize=7.5, color=BLUE)
for lbl, x in [('VCC', 79), ('DATA', 85), ('GND', 91)]:
    ax.text(x, 21.2, lbl, ha='center', fontsize=7.5)
    ax.add_patch(Circle((x, 24.4), 0.5, color=GRAY))
# DATA <- D7 (xanh lá)
ax.plot([33, 85, 85], [32, 32, 24.4], color=GREEN, lw=1.8)
# VCC <- 3V3 (đỏ)
ax.plot([33, 79, 79], [26, 26, 24.4], color=RED, lw=1.8)
# GND DHT -> thanh GND
ax.plot([91, 91, GND_X], [24.4, 28, 28], color='black', lw=1.5)
# điện trở kéo lên 10k giữa DATA và VCC (nét đứt = tuỳ chọn)
ax.plot([62, 62], [26, 27.6], color=GRAY, lw=1.2, ls='--'); ax.plot([62, 62], [30.4, 32], color=GRAY, lw=1.2, ls='--')
ax.add_patch(Rectangle((61.2, 27.6), 1.6, 2.8, fc='white', ec=GRAY, ls='--'))
ax.text(63.6, 29, '10kΩ kéo lên (tuỳ chọn)', fontsize=7, color=GRAY, va='center')
ax.add_patch(Circle((62, 26), 0.5, color=RED)); ax.add_patch(Circle((62, 32), 0.5, color=GREEN))

# legend
ax.text(36, 1.0, 'Dây cam: tín hiệu LED   |   Dây xanh lá: DATA cảm biến   |   Dây đỏ: 3V3   |   Dây đen: GND   (A = anode/chân dài, K = cathode/chân ngắn)',
        fontsize=8, color=GRAY)
plt.savefig(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), OUT), bbox_inches='tight', facecolor='white')
print('ok')
