# Network Sandbox Simulator — Milestone Development Plan

Bu doküman, `network-sandbox-simulator-spec.md` içindeki teknik kapsamı adım adım geliştirmek için kullanılacaktır.

Amaç, AI coding agent'ın projeyi tek seferde büyük bir kod yığını olarak oluşturmaması; her milestone'ı tamamladıktan sonra çalışan sistemi kontrol etmesi ve yalnızca doğrulanan aşamadan sonra sonraki aşamaya geçmesidir.

---

# Genel Geliştirme Kuralı

Her milestone şu sırayla uygulanmalıdır:

```text
PLAN
 ↓
IMPLEMENT
 ↓
RUN
 ↓
VERIFY
 ↓
FIX
 ↓
CHECKPOINT
 ↓
NEXT MILESTONE
```

Agent bir milestone'ın gereksinimleri doğrulanmadan sonraki milestone'a geçmemelidir.

Her milestone sonunda:

- Uygulama çalışıyor mu?
- TypeScript hatası var mı?
- Runtime error var mı?
- Önceki milestone'lardaki özellikler hâlâ çalışıyor mu?
- Yeni eklenen sistem beklenen davranışı gösteriyor mu?
- Mimari kurallara uyuluyor mu?

kontrol edilmelidir.

---

# Milestone 0 — Proje Scaffold

## Amaç

Temiz ve genişletilebilir React + TypeScript projesini oluşturmak.

## Yapılacaklar

- Vite + React + TypeScript projesi oluştur.
- Gerekli temel dependency'leri kur.
- ESLint / formatting altyapısını kur.
- Temel klasör yapısını oluştur.
- Simulation ve UI katmanlarını ayır.
- Zustand store temelini oluştur.
- React Flow veya seçilen canvas çözümünü entegre et.
- Web Worker kullanılacaksa worker altyapısının temelini hazırla.

Önerilen yapı:

```text
src/
├── simulation/
├── components/
├── store/
├── types/
├── hooks/
├── workers/
└── utils/
```

## Kontrol

```bash
npm run build
npm run lint
```

Kontroller:

- Build başarılı.
- TypeScript hatası yok.
- Lint hatası yok.
- Uygulama browser'da açılıyor.
- Canvas render oluyor.

## Tamamlanma kriteri

Boş bir network canvas'ı açılmalı ve proje temiz şekilde build edilebilmelidir.

---

# Milestone 1 — Network Canvas

## Amaç

Oyuncunun cihazları yerleştirebileceği temel network editor'ü oluşturmak.

## Yapılacaklar

- Canvas oluştur.
- Zoom.
- Pan.
- Node selection.
- Node movement.
- Grid.
- Basic toolbar.
- Device sidebar.
- Cihaz ekleme.
- Cihaz silme.
- Cihaz seçme.

İlk cihaz tipleri:

```text
PC
Switch
Router
Server
```

## Kontrol

- PC eklenebiliyor mu?
- Switch eklenebiliyor mu?
- Router eklenebiliyor mu?
- Server eklenebiliyor mu?
- Node taşınabiliyor mu?
- Node seçilebiliyor mu?
- Node silinebiliyor mu?
- Canvas zoom/pan çalışıyor mu?

## Tamamlanma kriteri

Oyuncu boş canvas'a cihazlar yerleştirebilmelidir.

---

# Milestone 2 — Network Device Abstraction

## Amaç

Tüm network cihazlarının ortak bir domain modeline sahip olması.

## Yapılacaklar

Temel abstraction:

```text
NetworkDevice
├── Client
├── Switch
├── Router
├── Firewall
├── Server
├── AccessPoint
└── LoadBalancer
```

İlk aşamada sadece gerekli cihazlar implementation alabilir.

Temel ortak özellikler:

```text
id
name
type
status
ports
interfaces
macAddress
ipAddresses
metrics
```

## Kontrol

Her cihaz:

- unique ID
- name
- type
- ports
- status

bilgilerine sahip olmalıdır.

UI doğrudan simulation logic çalıştırmamalıdır.

## Tamamlanma kriteri

Yeni bir device type eklemek mevcut kodu bozmayacak şekilde yapılabilmelidir.

---

# Milestone 3 — Port System

## Amaç

Cihazların gerçek fiziksel/logical portlara sahip olması.

## Yapılacaklar

Örneğin:

```text
SW-01

Gi0/1
Gi0/2
Gi0/3
Gi0/4
```

Port özellikleri:

```text
status
speed
duplex
mode
vlan
connectedDevice
```

Durumlar:

```text
UP
DOWN
BLOCKED
```

## Kontrol

- Port seçilebiliyor mu?
- Port boş/dolu görülebiliyor mu?
- Port DOWN yapılınca bağlantı etkileniyor mu?
- Port tekrar UP yapılınca bağlantı geri geliyor mu?
- Aynı porta birden fazla connection yapılamıyor mu?

## Tamamlanma kriteri

Network bağlantıları device node'ları arasında soyut bir çizgi değil, gerçek port bağlantıları olmalıdır.

---

# Milestone 4 — Connection / Cable System

## Amaç

Cihazların birbirine bağlanması.

## Yapılacaklar

Connection modeli:

```text
Connection
├── id
├── sourceDevice
├── sourcePort
├── destinationDevice
├── destinationPort
├── type
├── status
└── metrics
```

Kablo tipleri gelecekte genişletilebilir.

İlk aşamada:

```text
Ethernet
```

yeterlidir.

## Kontrol

Test:

```text
PC-01
  │
Switch-01
  │
Router-01
```

- Kablo oluşturulabiliyor mu?
- Kablo silinebiliyor mu?
- Port durumları güncelleniyor mu?
- Disconnect çalışıyor mu?

## Tamamlanma kriteri

PC → Switch → Router fiziksel topology oluşturulabilmelidir.

---

# Milestone 5 — Simulation Engine Core

## Amaç

Görsel UI'dan bağımsız gerçek simulation engine oluşturmak.

## Yapılacaklar

Temel:

```text
SimulationEngine
Network
SimulationEvent
Scheduler
```

Simulation Engine:

- Device state
- Connection state
- Packet state
- Event state

yönetmelidir.

React sadece engine state'ini görüntülemelidir.

## Önemli

Şu yapıdan kaçınılmalı:

```text
React Component
    ↓
Network logic
    ↓
Packet logic
```

Tercih:

```text
React
  ↓
Simulation API
  ↓
Simulation Engine
  ↓
Network State
```

## Kontrol

- UI olmadan simulation engine test edilebiliyor mu?
- Device state değiştirilebiliyor mu?
- Simulation event oluşturulabiliyor mu?
- Simulation engine deterministic test edilebiliyor mu?

## Tamamlanma kriteri

Simulation Engine bağımsız bir TypeScript modülü olarak çalışmalıdır.

---

# Milestone 6 — Packet Model

## Amaç

Network içindeki paketleri temsil edecek temel modeli oluşturmak.

## Yapılacaklar

Packet:

```text
id
source
destination
protocol
size
ttl
timestamp
status
route
ethernet
ip
transport
application
```

Status:

```text
CREATED
QUEUED
FORWARDED
DELIVERED
DROPPED
EXPIRED
```

## Kontrol

Bir packet oluştur:

```text
PC-01 → Router-01
```

Packet:

- unique ID almalı
- timestamp almalı
- source/destination bilmeli
- route bilgisi tutmalı
- status değiştirebilmeli

## Tamamlanma kriteri

Simulation Engine içerisinde packet oluşturulabilmelidir.

---

# Milestone 7 — Packet Engine

## Amaç

Packet'ın network içerisinde gerçekten ilerlemesini sağlamak.

## Yapılacaklar

Packet Engine:

```text
createPacket()
routePacket()
forwardPacket()
dropPacket()
deliverPacket()
expirePacket()
```

Packet route:

```text
PC-01
 ↓
SW-01
 ↓
Router-01
 ↓
Server-01
```

## Kontrol

Packet:

1. PC'den çıkmalı.
2. Switch'e ulaşmalı.
3. Router'a ulaşmalı.
4. Destination'a ulaşmalı.
5. Her hop'u history'ye yazmalı.

Örnek:

```text
route:
[
  PC-01,
  SW-01,
  Router-01,
  Server-01
]
```

## Tamamlanma kriteri

Packet fiziksel topology üzerinden ilerlemelidir.

---

# Milestone 8 — Ethernet + MAC

## Amaç

Packet Engine'e temel Layer 2 davranışı eklemek.

## Yapılacaklar

- MAC address.
- Ethernet frame.
- Switch forwarding.
- MAC address table.
- Unknown destination handling.
- Broadcast.

Switch:

```text
MAC → Port
```

tablosu tutmalıdır.

## Kontrol

PC-01'in MAC adresi Switch tarafından öğrenilmeli.

Örneğin:

```text
AA:BB:CC:11:22:33 → Gi0/1
```

Packet doğru porta yönlendirilmeli.

## Tamamlanma kriteri

Switch Layer 2 forwarding simülasyonu yapmalıdır.

---

# Milestone 9 — IPv4

## Amaç

Layer 3 adresleme sisteminin temelini oluşturmak.

## Yapılacaklar

- IPv4 address.
- Subnet mask.
- Network address.
- Broadcast address.
- Same subnet check.
- Basic gateway concept.

Örnek:

```text
192.168.10.25
255.255.255.0
```

## Kontrol

Engine:

```text
192.168.10.20
192.168.10.30
```

adreslerinin aynı subnet olduğunu anlamalı.

Ancak:

```text
192.168.10.20
192.168.20.30
```

adreslerinin farklı network olduğunu anlamalı.

---

# Milestone 10 — ARP

## Amaç

IPv4 adresinden MAC adresine çözümleme yapılmasını sağlamak.

## Yapılacaklar

ARP:

```text
ARP Request
ARP Reply
ARP Cache
```

Örnek:

```text
Who has 192.168.10.1?
```

↓

```text
192.168.10.1 is at AA:BB:CC:...
```

## Kontrol

PC:

```text
ping 192.168.10.1
```

yaptığında ARP cache boşsa:

```text
ARP Request
↓
ARP Reply
↓
ICMP
```

oluşmalıdır.

---

# Milestone 11 — ICMP / Ping

## Amaç

İlk gerçek network tool'u oluşturmak.

## Yapılacaklar

Terminal:

```text
ping 192.168.10.1
```

Packet:

```text
ICMP Echo Request
ICMP Echo Reply
```

## Kontrol

Başarılı ping:

```text
64 bytes from 192.168.10.1
time=4ms
```

Başarısız ping:

```text
Request timed out.
```

olmalıdır.

Failure sebepleri simulation state'e bağlı olmalıdır.

Örneğin:

- Cable disconnected
- Port down
- Wrong IP
- No route
- Firewall block

---

# Milestone 12 — DHCP

## Amaç

Clientların otomatik IP almasını sağlamak.

## Yapılacaklar

DHCP server:

```text
Network
Pool start
Pool end
Subnet mask
Gateway
DNS
Lease time
```

DHCP sequence:

```text
DISCOVER
OFFER
REQUEST
ACK
```

## Kontrol

Yeni PC bağlandığında:

```text
IP: DHCP
```

ise otomatik IP almalıdır.

Pool dolduğunda:

```text
DHCP POOL EXHAUSTED
```

olmalıdır.

## Tamamlanma kriteri

PC → Switch → DHCP Server topology'sinde client otomatik IP almalıdır.

---

# Milestone 13 — DNS

## Amaç

Hostname çözümlemesini sağlamak.

## Yapılacaklar

DNS records:

```text
example.local → 192.168.10.20
web.local     → 192.168.10.30
db.local      → 192.168.20.10
```

DNS query:

```text
A record
```

ilk etapta yeterlidir.

## Kontrol

Terminal:

```text
nslookup web.local
```

ve:

```text
ping web.local
```

çalışmalıdır.

DNS server kapalıysa isim çözümleme başarısız olmalıdır.

---

# Milestone 14 — Routing

## Amaç

Farklı networklerin birbiriyle iletişim kurmasını sağlamak.

## Yapılacaklar

- Router interfaces.
- Routing table.
- Static routes.
- Default route.
- Next hop.
- Route lookup.

Örnek:

```text
192.168.10.0/24
        │
     Router
        │
192.168.20.0/24
```

## Kontrol

PC:

```text
192.168.10.20
```

Server:

```text
192.168.20.20
```

olduğunda router üzerinden erişim sağlanmalı.

Yanlış route verilirse packet:

```text
NO ROUTE
```

olarak düşmelidir.

---

# Milestone 15 — VLAN

## Amaç

Layer 2 network segmentation.

## Yapılacaklar

- VLAN creation.
- Access port.
- Trunk port.
- VLAN membership.
- VLAN isolation.

Örnek:

```text
VLAN 10 Employees
VLAN 20 Servers
VLAN 30 Guests
VLAN 40 Management
```

## Kontrol

VLAN 10'daki PC:

```text
VLAN 20
```

cihazına doğrudan Layer 2 erişememeli.

Router/inter-VLAN routing yoksa trafik düşmelidir.

---

# Milestone 16 — Firewall

## Amaç

Packet filtering sistemi.

## Yapılacaklar

Rule modeli:

```text
source
destination
protocol
sourcePort
destinationPort
action
priority
enabled
```

Actions:

```text
ALLOW
DENY
```

## Kontrol

Örnek:

```text
LAN → WEB : TCP/443 ALLOW
WAN → LAN : ANY DENY
```

test edilmeli.

Firewall rule değiştirildiğinde aynı packet farklı sonuç vermelidir.

---

# Milestone 17 — NAT

## Amaç

Private IP'lerin simulated Internet üzerinden iletişimini sağlamak.

## Yapılacaklar

İlk etapta:

```text
PAT / NAT Overload
```

yeterlidir.

Örnek:

```text
192.168.10.20
        ↓
Router
        ↓
203.0.113.10
```

## Kontrol

LAN client internet serverına erişebilmeli.

NAT tablosu görülebilmeli:

```text
Inside Local
192.168.10.20:49231

Inside Global
203.0.113.10:40001
```

---

# Milestone 18 — Packet Inspector

## Amaç

Packet detaylarının kullanıcı tarafından incelenebilmesi.

## Yapılacaklar

Inspector:

```text
Packet ID
Timestamp
Source
Destination
Protocol
Size
TTL
Status
Route
Ethernet
IP
Transport
Application
```

## Kontrol

Canvas üzerindeki packet seçildiğinde inspector açılmalı.

Packet'ın route'u görsel ve metinsel olarak gösterilmeli.

---

# Milestone 19 — Packet Capture

## Amaç

Network trafiğini tablo halinde izlemek.

## Yapılacaklar

Capture ekranı:

```text
TIME
SOURCE
DESTINATION
PROTOCOL
PORT
SIZE
STATUS
```

Filtreler:

```text
TCP
UDP
ICMP
DHCP
DNS
ARP
Dropped
Blocked
```

## Kontrol

Networkte oluşturulan packet capture listesine düşmeli.

Filter uygulandığında yalnızca ilgili packetlar gösterilmeli.

---

# Milestone 20 — Terminal

## Amaç

Oyuncunun network ile CLI üzerinden etkileşim kurabilmesi.

## İlk komutlar

```text
ping
ipconfig
ifconfig
arp
nslookup
traceroute
```

Daha sonra cihaz türüne göre:

```text
show interfaces
show ip route
show vlan
show arp
show mac address-table
```

gibi komutlar eklenebilir.

## Kontrol

Terminal komutları simulation engine API'lerine bağlanmalıdır.

Terminal içerisinde sahte string cevapları hardcode etmek yerine gerçek simulation state kullanılmalıdır.

---

# Milestone 21 — Device Monitoring

## Amaç

Network cihazlarının runtime durumlarını göstermek.

## Metrikler

```text
CPU
RAM
Network Throughput
Packets/sec
Packet Loss
Latency
Connections
Interface Status
```

## Kontrol

Packet trafiği arttığında network throughput ve packet counters değişmelidir.

Cihaz overload olduğunda CPU/latency değerleri simulation state'e göre değişmelidir.

---

# Milestone 22 — Performance Simulation

## Amaç

Network cihazlarının kapasite sınırlarını simüle etmek.

## Yapılacaklar

Her cihazın:

```text
maxThroughput
maxPacketsPerSecond
processingCapacity
```

gibi değerleri olabilir.

Örneğin:

```text
Firewall:
Max throughput: 500 Mbps
```

Traffic:

```text
750 Mbps
```

olduğunda:

```text
FIREWALL OVERLOAD
```

oluşabilir.

## Kontrol

Normal traffic:

```text
Latency düşük
Packet loss yok
```

Aşırı traffic:

```text
Latency artışı
Packet loss
CPU artışı
```

oluşturmalıdır.

---

# Milestone 23 — Random Event Engine

## Amaç

Networkün dinamik olarak sorunlarla karşılaşmasını sağlamak.

## Event türleri

```text
PORT_FAILURE
CABLE_FAILURE
INTERFACE_DOWN
DHCP_POOL_EXHAUSTED
DNS_FAILURE
SERVER_OVERLOAD
NETWORK_CONGESTION
```

## Kurallar

Random event tamamen rastgele olmamalıdır.

Örneğin DHCP server olmayan bir networkte:

```text
DHCP_POOL_EXHAUSTED
```

üretilmemelidir.

Event probability network state'e bağlı olabilir.

## Kontrol

Event oluştuğunda:

- Event log'a düşmeli.
- Network state değişmeli.
- İlgili packet davranışı etkilenmeli.
- Kullanıcı problemi görebilmeli.
- Event çözülünce network normale dönmeli.

---

# Milestone 24 — Security Event Engine

## Amaç

Simüle edilmiş siber olaylar oluşturmak.

## Events

```text
PORT_SCAN
SSH_BRUTE_FORCE
DDOS
ARP_SPOOFING
SUSPICIOUS_TRAFFIC
```

## Önemli

Bu sistem gerçek saldırı gerçekleştiren kod yazmamalıdır.

Saldırılar simulation eventleridir.

Örneğin:

```text
PORT_SCAN
source: attacker-01
target: web-01
ports: [22,80,443,3306]
```

şeklinde state üretir.

## Kontrol

Security event:

- Event log'a düşmeli.
- Packet trafiği oluşturmalı.
- Monitoring sisteminde görünmeli.
- Firewall tarafından engellenebilmeli.
- Kullanıcı müdahalesi sonrası etkisi ortadan kalkabilmeli.

---

# Milestone 25 — Security Response

## Amaç

Oyuncunun saldırılara müdahale edebilmesi.

## Örnek

Port scan:

```text
Attack detected
        ↓
Firewall
        ↓
Block source
        ↓
Traffic stops
```

DDoS:

```text
Traffic spike
        ↓
Rate limit
        ↓
Filtering
        ↓
Load decreases
```

Brute force:

```text
SSH attack
        ↓
Firewall rule
        ↓
Source blocked
```

## Kontrol

Oyuncunun aldığı önlem simulation state'i gerçekten değiştirmelidir.

---

# Milestone 26 — Next Event System

## Amaç

Simulation'ın kontrollü şekilde event event ilerletilebilmesi.

UI:

```text
[ NEXT EVENT ]
```

Butona basıldığında simulation queue'daki bir sonraki anlamlı event çalıştırılır.

Örneğin:

```text
NEXT EVENT
→ DHCP DISCOVER

NEXT EVENT
→ DHCP OFFER

NEXT EVENT
→ DHCP REQUEST

NEXT EVENT
→ DHCP ACK
```

## Kurallar

Play/Pause sistemi kullanılmayacaktır.

Next Event:

- Simulation scheduler ile çalışmalı.
- Event queue'dan gerçek event seçmeli.
- UI tarafında sahte event üretmemeli.

## Kontrol

Bir DHCP işlemi Next Event ile adım adım takip edilebilmelidir.

---

# Milestone 27 — Save / Load Topology

## Amaç

Sandbox networklerinin kaydedilip tekrar açılabilmesi.

## Yapılacaklar

Topology JSON:

```json
{
  "version": 1,
  "devices": [],
  "connections": [],
  "vlans": [],
  "routes": [],
  "firewallRules": []
}
```

## Kontrol

Test:

```text
Create topology
      ↓
Save
      ↓
Reload page
      ↓
Load
      ↓
Topology restored
```

Simulation state ile editor state birbirinden doğru şekilde ayrılmalıdır.

---

# Milestone 28 — UI / UX Polish

## Amaç

Core simulation tamamlandıktan sonra kullanıcı deneyimini iyileştirmek.

## UI bölümleri

```text
┌─────────────────────────────────────────────────────────┐
│ Toolbar                                                 │
├──────────┬──────────────────────────────┬───────────────┤
│ Devices  │                              │ Inspector     │
│          │       Network Canvas         │               │
│ PC       │                              │ Device        │
│ Switch   │                              │ Packet        │
│ Router   │                              │ Firewall      │
│ Server   │                              │               │
├──────────┴──────────────────────────────┴───────────────┤
│ Event Log / Packet Capture / Terminal / Monitoring      │
├─────────────────────────────────────────────────────────┤
│ [ NEXT EVENT ]                                           │
└─────────────────────────────────────────────────────────┘
```

## Kontrol

- Responsive layout
- Clear device selection
- Clear packet selection
- Error messages
- Event notifications
- Loading states
- Empty states
- Keyboard shortcuts

---

# Milestone 29 — Full Integration Test

Bu milestone yeni feature eklemek için değildir.

Amaç tüm sistemlerin birlikte çalıştığını doğrulamaktır.

## Test Topology

```text
                     INTERNET
                        │
                     Router
                        │
                    Firewall
                        │
                     Switch
                 ┌──────┼──────┐
                 │      │      │
              VLAN 10 VLAN 20 VLAN 30
                 │      │      │
                PC    Server  Guest
```

## Testler

### DHCP

PC otomatik IP alıyor mu?

### DNS

PC:

```text
web.local
```

çözebiliyor mu?

### Routing

VLAN/networkler arasında routing doğru mu?

### Firewall

Engellenen packet gerçekten düşüyor mu?

### Packet

Packet route doğru mu?

### Capture

Packet capture'a düşüyor mu?

### Inspector

Packet detayları doğru mu?

### Monitoring

Traffic ve device metrics güncelleniyor mu?

### Random Event

Cable failure sonrası packet düşüyor mu?

### Security

Port scan simulation görülebiliyor mu?

### Response

Firewall ile saldırı durdurulabiliyor mu?

### Next Event

Eventler sırayla ilerliyor mu?

### Save / Load

Topology doğru şekilde geri geliyor mu?

---

# Milestone 30 — Regression Test

Her büyük milestone sonrası önceki sistemlerin bozulmadığı kontrol edilmelidir.

Özellikle:

```text
PC → Switch → Router
```

temel bağlantısı her zaman çalışır durumda tutulmalıdır.

Regression checklist:

- [ ] Canvas çalışıyor
- [ ] Device creation çalışıyor
- [ ] Device deletion çalışıyor
- [ ] Port connection çalışıyor
- [ ] Packet creation çalışıyor
- [ ] Packet forwarding çalışıyor
- [ ] ARP çalışıyor
- [ ] Ping çalışıyor
- [ ] DHCP çalışıyor
- [ ] DNS çalışıyor
- [ ] Routing çalışıyor
- [ ] VLAN çalışıyor
- [ ] Firewall çalışıyor
- [ ] NAT çalışıyor
- [ ] Packet Capture çalışıyor
- [ ] Packet Inspector çalışıyor
- [ ] Terminal çalışıyor
- [ ] Monitoring çalışıyor
- [ ] Events çalışıyor
- [ ] Security events çalışıyor
- [ ] Next Event çalışıyor
- [ ] Save/Load çalışıyor

---

# Agent Checkpoint Format

Agent her milestone sonunda aşağıdaki formatta kısa bir rapor oluşturmalıdır:

```text
MILESTONE: 07 — Packet Engine

STATUS:
PASS

IMPLEMENTED:
- Packet creation
- Packet routing
- Packet forwarding
- Packet delivery
- Packet drop
- Route history

VERIFIED:
- PC → Switch → Router
- Packet reaches destination
- Route history correct
- Packet status changes correctly

TESTS:
- npm run build: PASS
- npm run lint: PASS
- Unit tests: PASS

REGRESSION:
- Milestone 01: PASS
- Milestone 02: PASS
- Milestone 03: PASS
- Milestone 04: PASS
- Milestone 05: PASS
- Milestone 06: PASS

KNOWN ISSUES:
- None

READY FOR:
Milestone 08
```

Eğer test başarısızsa:

```text
STATUS:
BLOCKED
```

olarak işaretlenmeli ve sonraki milestone'a geçilmemelidir.

---

# Agent Development Rules

## Rule 1 — Önce Core

UI polish'ten önce simulation engine çalışmalıdır.

## Rule 2 — Önce Test

Yeni protocol/device eklemeden önce davranış test edilmelidir.

## Rule 3 — Gerçek State

UI'da gösterilen bilgiler simulation state'ten gelmelidir.

Hardcoded fake values kullanılmamalıdır.

Yanlış:

```js
const latency = 20;
```

Doğru yaklaşım:

```text
Simulation
    ↓
Network metrics
    ↓
UI
```

## Rule 4 — Separation

Şu ayrım korunmalıdır:

```text
UI
│
├── Canvas
├── Inspector
├── Terminal
└── Monitoring
        │
        ↓
Simulation API
        │
        ↓
Simulation Engine
        │
        ├── Devices
        ├── Protocols
        ├── Packets
        └── Events
```

## Rule 5 — Yeni Feature Eklerken

Her feature için:

```text
Model
 ↓
Simulation logic
 ↓
Tests
 ↓
UI
 ↓
Integration
```

sırası tercih edilmelidir.

## Rule 6 — Gereksiz Feature Yok

Agent kendi başına:

- Mission
- Multiplayer
- Economy
- Tycoon
- Account system
- Social system

eklememelidir.

Bunlar proje kapsamı dışıdır.

---

# MVP Definition of Done

Aşağıdaki yapı tamamen çalıştığında ilk büyük MVP tamamlanmış kabul edilir:

```text
                 INTERNET
                    │
                 Router
                    │
                Firewall
                    │
                 Switch
              ┌─────┼─────┐
              │     │     │
             PC    Server  PC
```

Oyuncu:

1. Cihazları canvas'a koyabilmeli.
2. Portları bağlayabilmeli.
3. IP yapılandırabilmeli.
4. DHCP kullanabilmeli.
5. DNS kullanabilmeli.
6. Ping atabilmeli.
7. Packetların networkte ilerlemesini görebilmeli.
8. Packet detaylarını inceleyebilmeli.
9. Packet capture görebilmeli.
10. VLAN oluşturabilmeli.
11. Routing yapılandırabilmeli.
12. Firewall kuralı yazabilmeli.
13. NAT kullanabilmeli.
14. Terminal kullanabilmeli.
15. Network metrics görebilmeli.
16. Random network failure ile karşılaşabilmeli.
17. Simüle edilmiş security event görebilmeli.
18. Firewall ile saldırıya müdahale edebilmeli.
19. `Next Event` ile simulation'ı adım adım inceleyebilmeli.
20. Network topology'sini kaydedip yükleyebilmeli.

---

# Son Kontrol

MVP tamamlandığında agent şu soruya cevap verebilmelidir:

> "Bu proje sadece network cihazlarının çizildiği bir canvas mı, yoksa cihazların ve packetların gerçekten davranış gösterdiği bir simulation engine mi?"

Beklenen cevap:

```text
Simulation Engine.

Cihazlar gerçek state'e sahip.
Packetlar gerçek route üzerinden ilerliyor.
Protocol davranışları simüle ediliyor.
Firewall packetları filtreliyor.
DHCP IP dağıtıyor.
DNS isim çözüyor.
Routing packetları yönlendiriyor.
Events network state'i değiştirebiliyor.
Monitoring gerçek simulation metrics kullanıyor.
```

Bu seviyeye gelmeden proje tamamlanmış kabul edilmemelidir.
