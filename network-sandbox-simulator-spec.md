# Network Sandbox Simulator — Project Specification

## 1. Proje Özeti

Bu proje, tamamen web tabanlı çalışan bir **Network Simulator Sandbox** oyunudur.

Temel fikir:

> Cisco Packet Tracer benzeri bir network simülasyon ortamı oluşturmak; ancak bunu yalnızca eğitim aracı olarak değil, gerçek zamanlı network davranışları, packet takibi, arızalar ve siber saldırı olayları içeren bir sandbox oyun/simülasyon haline getirmek.

Oyuncuya boş bir network canvas'ı verilir. Oyuncu cihazları yerleştirir, birbirlerine bağlar, ağ yapılandırmalarını yapar ve networkün gerçek zamanlı davranışını izler.

Oyunun temel döngüsü:

```text
Network kur
    ↓
Yapılandır
    ↓
Networkü çalıştır
    ↓
Packet trafiğini izle
    ↓
Rastgele olayları gözlemle
    ↓
Sorunu analiz et
    ↓
Networkü düzelt / optimize et
```

Bu proje **Mission tabanlı olmayacaktır.** Tamamen sandbox yaklaşımı kullanılacaktır.

---

# 2. Proje Kapsamı

Aşağıdaki sistemler MVP ve sonrasında projenin temel parçasıdır.

## Dahil olacak sistemler

1. Cihaz sistemi
2. Gerçek network mantığı / simulation engine
3. Packet sistemi
4. Packet Inspector
5. Packet Sniffer / Network Capture
6. Firewall sistemi
7. VLAN sistemi
8. Routing
9. DNS
10. DHCP
11. Rastgele network olayları
12. Simüle edilmiş siber saldırılar
14. Sandbox Mode
15. Network Simulation Engine
16. Packet Engine
18. Network performans / monitoring sistemi
21. Event Timeline yerine `Next Event` yaklaşımı

## Şimdilik kapsam dışı

13. Mission sistemi — **İSTENMİYOR**
17. Ekonomi sistemi — **ŞİMDİLİK İSTENMİYOR**
19. Tycoon ekonomisi — **ŞİMDİLİK İSTENMİYOR**
20. Multiplayer / Co-op — **İSTENMİYOR**
21. Sürekli play/pause timeline — **İSTENMİYOR**

> Gelecekte 17/19 gibi ekonomi sistemleri tekrar değerlendirilebilir. Ancak MVP'de bulunmayacak.

---

# 3. Cihaz Sistemi

İlk sistemde network cihazları gerçek davranışlara sahip olmalıdır.

## Client cihazları

- PC
- Laptop
- Mobile
- IoT Device

Örnek:

```text
PC-01

Network
├── MAC: 00:1A:...
├── IP: DHCP
├── Gateway: 192.168.1.1
├── DNS: 192.168.1.10
└── VLAN: 10
```

## Network cihazları

- Switch
- Router
- Firewall
- Access Point
- Load Balancer

## Server cihazları

- DHCP Server
- DNS Server
- Web Server
- FTP Server
- Mail Server
- Database Server
- File Server

Cihazlar sadece görsel node olmayacak. Her cihaz Simulation Engine içerisinde gerçek davranışlara sahip olacak.

---

# 4. Gerçek Network Mantığı

Network bağlantısı yalnızca görsel olmayacak.

Örneğin:

```text
Router
   ↓
Switch
   ↓
PC
```

bağlandığında gerçek network davranışı simüle edilecek.

DHCP örneği:

```text
DHCP DISCOVER
       ↓
DHCP OFFER
       ↓
DHCP REQUEST
       ↓
DHCP ACK
```

PC gerçekten IP alacak.

Örnek:

```text
PC-01
IP: 192.168.10.24
MASK: 255.255.255.0
GATEWAY: 192.168.10.1
DNS: 192.168.10.10
```

---

# 5. Packet Sistemi

Network içerisinde oluşan her trafik bir Packet entity'si olarak modellenmelidir.

Örnek:

```js
{
  id: "packet-19231",
  source: "PC-01",
  destination: "WEB-01",
  protocol: "TCP",
  sourcePort: 49231,
  destinationPort: 443,
  size: 1240,
  ttl: 64
}
```

Packet network içerisinde cihazlardan geçerek ilerlemelidir.

Örnek:

```text
PC-01
  │
  │ TCP
  ↓
SW-01
  │
  │ TCP
  ↓
FW-01
  │
  │ TCP
  ↓
WEB-01
```

Packetların canvas üzerinde görsel olarak takip edilebilmesi istenmektedir.

---

# 6. Packet Inspector

Her packet seçilebilir olmalıdır.

Packet Inspector örneği:

```text
┌──────────────────────────────┐
│ Packet #19231                │
├──────────────────────────────┤
│ Source       PC-01           │
│ Destination  WEB-01          │
│ Protocol     TCP             │
│ Source Port  49231           │
│ Dest Port    443             │
│ Size         1240 bytes      │
│ TTL          64              │
│ Status       ACCEPTED        │
├──────────────────────────────┤
│ Route                        │
│ PC-01                        │
│   ↓                          │
│ SW-01                        │
│   ↓                          │
│ FW-01                        │
│   ↓                          │
│ WEB-01                       │
└──────────────────────────────┘
```

Packet'ın:

- Source
- Destination
- Protocol
- Port
- Size
- TTL
- Status
- Route
- Timestamp

gibi bilgileri görüntülenebilmelidir.

---

# 7. Packet Sniffer / Network Capture

Network üzerinde geçen trafik incelenebilmelidir.

Örnek:

```text
NETWORK CAPTURE

TIME      SRC       DEST       PROTOCOL
20:41     PC-01     DNS        UDP/53
20:41     PC-02     WEB        TCP/443
20:41     PC-03     DHCP       UDP/67
20:42     PC-01     WEB        TCP/443
20:42     ???       WEB        TCP/22
```

Bu sistem ileride Wireshark benzeri daha detaylı analiz özelliklerine genişletilebilir.

---

# 8. Firewall Sistemi

Firewall gerçek packet filtering yapmalıdır.

Örnek:

```text
FIREWALL RULES

#   Source       Destination     Port    Action

1   LAN          WEB             443     ALLOW
2   LAN          WEB             80      ALLOW
3   WAN          LAN             ANY     DENY
4   WAN          SERVER          22      DENY
5   LAN          DNS             53      ALLOW
```

Yanlış firewall configuration gerçek network davranışını etkilemelidir.

Örneğin:

```text
FIREWALL MISCONFIGURATION

Internet traffic cannot reach WEB-01.

Possible cause:
Rule #3 blocks TCP/443.
```

---

# 9. VLAN Sistemi

VLAN sistemi desteklenmelidir.

Örnek:

```text
VLAN 10 → Employees
VLAN 20 → Servers
VLAN 30 → Guest
VLAN 40 → Management
```

Topology:

```text
             SWITCH
          /     |      \
         /      |       \
     VLAN 10  VLAN 20  VLAN 30
      PCs      Servers   Guests
```

Oyuncu yanlış VLAN configuration yaptığında cihazların birbirine erişimi etkilenmelidir.

---

# 10. Routing

Routing sistemi desteklenmelidir.

Örnek:

```text
LAN A
192.168.10.0/24
       │
     Router
       │
192.168.20.0/24
       │
     Router
       │
LAN B
192.168.30.0/24
```

MVP'de:

- Static Route
- Default Route

desteklenmesi yeterlidir.

Gelecekte:

- OSPF
- RIP

gibi protokoller eklenebilir.

---

# 11. DNS Sistemi

DNS gerçek şekilde simüle edilmelidir.

Örnek kayıtlar:

```text
example.local → 192.168.20.10
mail.local    → 192.168.20.20
db.local      → 192.168.20.30
```

Bir client:

```text
ping example.local
```

yaptığında:

```text
PC
 ↓
DNS Query
 ↓
DNS Server
 ↓
192.168.20.10
 ↓
TCP Connection
```

gibi bir işlem gerçekleşmelidir.

---

# 12. DHCP Sistemi

DHCP gerçek IP allocation yapmalıdır.

Örnek:

```text
DHCP SERVER

Network: 192.168.10.0/24

Range:
192.168.10.100
       ↓
192.168.10.200

Gateway:
192.168.10.1

DNS:
192.168.10.10

Lease:
8 hours
```

DHCP pool bittiğinde gerçek bir network problemi oluşmalıdır.

Örnek:

```text
DHCP POOL EXHAUSTED

Available addresses: 0

37 devices are waiting for an IP.
```

---

# 13. Rastgele Network Olayları

Network sürekli çalışırken Event Engine rastgele olaylar üretebilmelidir.

Örnekler:

```text
Switch port failure
DHCP pool exhausted
DNS server unreachable
Web server overloaded
Suspicious traffic detected
Fiber cable disconnected
Router interface DOWN
```

Olaylar networkün mevcut durumuna göre de üretilebilmelidir.

Örneğin networkte DHCP server yoksa DHCP ile ilgili olayların ortaya çıkması mantıklı değildir.

---

# 14. Siber Saldırı Simülasyonları

Saldırılar gerçek sistemlere zarar veren exploit mekanizmaları olarak değil, oyunun Simulation Engine'i içerisinde güvenli şekilde modellenmiş network events olarak çalışmalıdır.

## Port Scan

```text
INTRUSION DETECTED

Source:
203.0.113.42

Target:
WEB-01

Ports:
22
80
443
3306
8080

Packets:
1,482
```

Oyuncu firewall üzerinden kaynağı engelleyebilir.

## DDoS

```text
TRAFFIC SPIKE

Normal:
12 Mbps

Current:
940 Mbps
```

Oyuncu:

- Rate limit
- Firewall
- Load Balancer
- Traffic filtering

gibi mekanizmalarla müdahale edebilir.

## Brute Force

```text
SSH ATTACK

WEB-01
Port: 22

Attempts:
1,283

Source:
185.x.x.x
```

Oyuncu SSH erişimini örneğin yalnızca Management VLAN'a açabilir.

## ARP Spoofing

```text
ARP ANOMALY

192.168.10.1

Expected MAC:
AA:BB:CC:11:22:33

Observed MAC:
FF:FF:FF:44:55:66
```

İleride Dynamic ARP Inspection gibi mekanizmalar simüle edilebilir.

---

# 15. Sandbox Mode

Oyunun ana ve tek oyun modu Sandbox olacaktır.

Mission sistemi olmayacaktır.

Oyuncuya boş bir canvas verilir.

Oyuncu:

- İstediği cihazı ekler
- Cihazları bağlar
- IP yapılandırır
- DHCP kurar
- DNS kurar
- VLAN oluşturur
- Routing yapılandırır
- Firewall kuralları oluşturur
- Server kurar
- Networkü çalıştırır
- Trafiği izler
- Saldırıları ve arızaları yönetir

Network istediği kadar büyütülebilir.

---

# 16. Network Simulation Engine

Simulation Engine projenin merkezidir.

React UI ile simulation logic birbirinden ayrılmalıdır.

Önerilen mimari:

```text
                    ┌──────────────────────┐
                    │      React UI        │
                    │   Network Canvas     │
                    └──────────┬───────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │ Simulation Engine    │
                    │                      │
                    │ DHCP                 │
                    │ DNS                  │
                    │ ARP                  │
                    │ Routing              │
                    │ TCP                  │
                    │ UDP                  │
                    │ Firewall             │
                    │ NAT                  │
                    └──────────┬───────────┘
                               │
                    ┌──────────┴───────────┐
                    ↓                      ↓
             Packet Engine            Event Engine
                    │                      │
                    ↓                      ↓
             Packet History          Random Events
```

Simulation Engine React component state'ine gömülmemelidir.

React yalnızca simulation state'ini görselleştirmelidir.

---

# 17. Packet Engine

Packet Engine ayrı bir modül olmalıdır.

Protokol katmanları:

```text
Packet
│
├── Ethernet
│
├── ARP
│
├── IPv4
│
├── TCP
│
├── UDP
│
└── Application
    ├── DHCP
    ├── DNS
    ├── HTTP
    └── HTTPS
```

Packet modeli örneği:

```js
Packet {
   source
   destination

   ethernet
   ip
   transport
   application

   ttl
   size
   timestamp

   route[]
   status
}
```

Packet Engine aşağıdakilerden sorumlu olmalıdır:

- Packet oluşturma
- Packet routing
- Packet forwarding
- Packet filtering
- Packet drop
- TTL yönetimi
- Packet history
- Packet animation eventleri
- Protocol state

---

# 18. Network Performance / Monitoring

Network cihazlarının gerçek zamanlı durumları izlenebilmelidir.

Örneğin:

```text
Router CPU       32%
Switch CPU       17%
Firewall CPU     81%
Server CPU       94%
Network Traffic  730 Mbps
```

İleride cihaz kapasitesine göre performans sorunları oluşturulabilir.

Örneğin:

```text
FIREWALL OVERLOAD

Packet processing latency:
12ms → 481ms
```

Monitoring sistemi:

- CPU
- RAM
- Network throughput
- Packet count
- Packet loss
- Latency
- Interface status
- Connection count
- Firewall load
- Server load

gibi metrikleri gösterebilmelidir.

---

# 19. Fiziksel Network Katmanı

Cihazların fiziksel portları olmalıdır.

Örneğin:

```text
SW-01

Gi0/1  ─── PC-01
Gi0/2  ─── PC-02
Gi0/3  ─── PC-03
Gi0/4  ─── Router
Gi0/5  ─── Server
```

Port durumları:

```text
🟢 UP
🔴 DOWN
🟡 BLOCKED
```

Port özellikleri:

```text
Speed: 1 Gbps
Duplex: Full
VLAN: 10
Mode: ACCESS
```

Kablo kopması veya port kapanması gerçek network davranışını etkilemelidir.

---

# 20. Multiplayer

Multiplayer / Co-op sistemi projede bulunmayacaktır.

Bu proje tek oyunculu sandbox olacaktır.

---

# 21. Event Timeline / Simulation Control

Sürekli Play / Pause timeline kullanılmayacaktır.

Bunun yerine:

```text
NEXT EVENT
```

butonu bulunmalıdır.

Örneğin:

```text
[ NEXT EVENT ]
```

tıklandığında Simulation Engine bir sonraki anlamlı simulation eventini çalıştırabilir.

Örnek:

```text
NEXT EVENT

→ DHCP Request
```

Sonra:

```text
NEXT EVENT

→ DHCP ACK
```

Sonra:

```text
NEXT EVENT

→ DNS Query
```

Bu yapı özellikle debug, eğitim ve network davranışını inceleme açısından kullanılabilir.

---

# 22. Teknoloji Stack

Önerilen frontend stack:

- React
- Vite
- TypeScript
- React Flow veya benzeri network/canvas kütüphanesi
- Zustand
- Web Workers

Backend ilk MVP'de zorunlu değildir.

Simulation Engine mümkün olduğunca browser içerisinde çalışmalıdır.

Gerekirse daha sonra Node.js backend eklenebilir.

---

# 23. Önerilen Proje Yapısı

```text
src/
├── simulation/
│   ├── engine/
│   │   ├── SimulationEngine.ts
│   │   ├── Network.ts
│   │   └── Scheduler.ts
│   │
│   ├── devices/
│   │   ├── Router.ts
│   │   ├── Switch.ts
│   │   ├── Firewall.ts
│   │   ├── Server.ts
│   │   ├── Client.ts
│   │   ├── AccessPoint.ts
│   │   └── LoadBalancer.ts
│   │
│   ├── protocols/
│   │   ├── DHCP.ts
│   │   ├── DNS.ts
│   │   ├── ARP.ts
│   │   ├── TCP.ts
│   │   ├── UDP.ts
│   │   └── ICMP.ts
│   │
│   ├── packets/
│   │   ├── Packet.ts
│   │   └── PacketEngine.ts
│   │
│   └── events/
│       ├── EventEngine.ts
│       ├── AttackEvents.ts
│       └── FailureEvents.ts
│
├── components/
│   ├── NetworkCanvas/
│   ├── DevicePanel/
│   ├── PacketInspector/
│   ├── PacketCapture/
│   ├── Terminal/
│   ├── EventLog/
│   └── Monitoring/
│
└── store/
    └── networkStore.ts
```

Bu yapı başlangıç için öneridir ve agent tarafından implementation sırasında gerekirse iyileştirilebilir.

---

# 24. MVP Tanımı

İlk MVP, tüm sistemleri bir anda eksiksiz uygulamak yerine simulation engine'in temelini sağlam şekilde kurmalıdır.

## MVP Faz 1 — Core Simulation

İlk çalışan sürümde:

### UI

- Network canvas
- Device sidebar
- Cihaz ekleme
- Cihaz seçme
- Cihaz silme
- Kablo / connection oluşturma
- Connection silme
- Basic device properties panel

### Cihazlar

- PC
- Switch
- Router
- Server

### Network

- MAC
- IPv4
- Subnet
- Gateway
- Ethernet bağlantısı
- Port sistemi
- Basic routing

### Protokoller

- ARP
- ICMP
- DHCP
- DNS

### Packet Engine

- Packet creation
- Packet forwarding
- Packet routing
- Packet drop
- Packet history
- Packet animation
- Packet Inspector

### Network Tools

- Ping
- Basic terminal
- Network capture

---

# 25. MVP Faz 2 — Network Configuration

Core simulation çalıştıktan sonra:

- VLAN
- Static Route
- Default Route
- Firewall
- NAT
- DNS records
- DHCP pools
- Port configuration
- Access / Trunk mode
- Interface status

eklenecek.

---

# 26. MVP Faz 3 — Events

Simulation engine stabil hale geldikten sonra:

- Switch port failure
- Cable failure
- DHCP exhaustion
- DNS failure
- Server overload
- Router interface failure
- Network congestion

gibi random events eklenecek.

Event Engine network state'i dikkate almalı ve anlamsız olaylar üretmemelidir.

---

# 27. MVP Faz 4 — Security Simulation

Sonrasında:

- Port scan
- SSH brute force
- DDoS simulation
- ARP spoofing
- Suspicious traffic
- Firewall alerts

eklensin.

Saldırılar tamamen simulation layer içerisinde çalışmalı ve gerçek dünyadaki sistemlere saldırı gerçekleştirecek kod içermemelidir.

---

# 28. MVP Faz 5 — Monitoring

Son aşamada:

- CPU
- RAM
- Traffic
- Packet count
- Packet loss
- Latency
- Interface status
- Firewall load
- Server load

monitoring ekranları eklenmeli.

---

# 29. Gelecekte Eklenebilecekler

Şimdilik yapılmayacak ancak mimarinin destekleyebileceği özellikler:

- Daha fazla router protocolü
- OSPF
- RIP
- HTTPS detayları
- FTP
- Mail
- Database server
- Daha gelişmiş IDS/IPS
- Dynamic ARP Inspection
- Load balancing
- Daha gelişmiş server simulation
- Network topology export/import
- Network save/load
- JSON topology formatı
- Daha gelişmiş network analytics
- Tycoon/economy sistemi
- Daha ileri seviye cihazlar

Multiplayer bu projenin hedefinde değildir.

---

# 30. Tasarım İlkeleri

## Simulation First

Öncelik görsel UI değil, doğru çalışan simulation engine'dir.

## Deterministic Core

Simulation Engine mümkün olduğunca deterministic çalışmalıdır.

Random event sistemi kontrollü bir randomness katmanı kullanmalıdır.

## UI / Engine Separation

React componentleri network logic içermemelidir.

## Extensibility

Yeni cihaz veya protokol eklemek mevcut sistemi bozmamalıdır.

Örneğin daha sonra:

```text
class Firewall extends NetworkDevice
class Router extends NetworkDevice
class Switch extends NetworkDevice
```

gibi genişletilebilir bir yapı tercih edilmelidir.

## Event Driven Architecture

Simulation olayları event tabanlı tasarlanmalıdır.

Örneğin:

```text
DEVICE_CONNECTED
PACKET_CREATED
PACKET_FORWARDED
PACKET_DROPPED
DHCP_REQUEST
DHCP_RESPONSE
DNS_QUERY
FIREWALL_BLOCK
INTERFACE_DOWN
ATTACK_DETECTED
```

gibi eventler kullanılabilir.

---

# 31. Agent İçin Başlangıç Talimatı

Bu doküman projeye başlamadan önce AI coding agent'a verilmelidir.

Agent'ın ilk aşamada tüm sistemi tek seferde yazması istenmemektedir.

İlk olarak:

1. Proje scaffold'unu oluştur.
2. React + Vite + TypeScript kur.
3. Network canvas oluştur.
4. Simulation Engine temel interface'lerini oluştur.
5. NetworkDevice abstraction oluştur.
6. PC, Switch, Router ve Server modellerini oluştur.
7. Port ve Connection sistemini oluştur.
8. Packet modelini oluştur.
9. Packet Engine'in temelini oluştur.
10. Event sisteminin temelini oluştur.
11. Zustand store'u UI state için kullan.
12. Simulation logic'i React componentlerinden ayır.
13. Çalışan minimal bir network oluştur.
14. PC → Switch → Router bağlantısını simüle et.
15. ICMP ping simulation'ını çalıştır.
16. Packet'ın cihazlar arasında ilerlemesini canvas üzerinde göster.
17. Packet Inspector ile packet detaylarını görüntüle.

Bu aşama tamamlanmadan VLAN, Firewall, DDoS, ARP spoofing veya gelişmiş monitoring gibi sistemlere geçilmemelidir.

---

# 32. İlk Başlangıç Hedefi

İlk milestone şu olmalıdır:

```text
┌─────────────────────────────────────────────────────────┐
│ Network Sandbox Simulator                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   💻 PC-01                                              │
│      │                                                  │
│      │                                                  │
│      ▼                                                  │
│   🖧 SW-01                                              │
│      │                                                  │
│      ▼                                                  │
│   🌐 Router-01                                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Packet Log                                              │
│                                                         │
│ ICMP Echo Request                                       │
│ PC-01 → Router-01                                       │
│                                                         │
│ ICMP Echo Reply                                         │
│ Router-01 → PC-01                                       │
└─────────────────────────────────────────────────────────┘
```

Oyuncu:

1. PC ekler.
2. Switch ekler.
3. Router ekler.
4. Kabloları bağlar.
5. IP yapılandırır.
6. Ping gönderir.
7. Packet canvas üzerinde hareket eder.
8. Packet Inspector packetı gösterir.

Bu çalıştığında projenin gerçek simulation temelinin başarılı olduğu kabul edilir.

---

# 33. Önemli Not

Bu proje bir network görselleştirme uygulaması değildir.

Hedef:

> **Gerçek network kavramlarını oyunlaştırılmış, etkileşimli ve güvenli bir browser simulation engine içerisinde mümkün olduğunca davranışsal olarak simüle etmek.**

Görsel olarak Cisco Packet Tracer'a benzer bir kullanım hissi olabilir; ancak proje kendi simulation engine'ine sahip bağımsız bir sandbox olacaktır.

Ana hedefler:

- Gerçekçi network davranışı
- Etkileşimli packet sistemi
- Cihazların davranışsal simülasyonu
- Firewall ve network security
- Rastgele network arızaları
- Simüle edilmiş saldırılar
- Network monitoring
- Tamamen sandbox gameplay
- Genişletilebilir TypeScript mimarisi

---

# 34. Development Priority

Öncelik sırası:

```text
1. Project scaffold
        ↓
2. Network Canvas
        ↓
3. Device abstraction
        ↓
4. Ports & Connections
        ↓
5. Simulation Engine
        ↓
6. Packet Engine
        ↓
7. Ethernet / IPv4
        ↓
8. ARP
        ↓
9. ICMP / Ping
        ↓
10. DHCP
        ↓
11. DNS
        ↓
12. Routing
        ↓
13. VLAN
        ↓
14. Firewall
        ↓
15. NAT
        ↓
16. Packet Capture / Inspector
        ↓
17. Monitoring
        ↓
18. Random Events
        ↓
19. Security Events
        ↓
20. UI polish
```

Agent hiçbir aşamada sonraki fazları gereksiz yere erken implement etmemelidir.

---

# 35. Başlangıç Kuralı

Kodlama başlamadan önce agent:

- Bu dokümanı analiz etmeli.
- Mimariyi doğrulamalı.
- Gereksiz feature eklememeli.
- Mission sistemi eklememeli.
- Multiplayer eklememeli.
- Economy/Tycoon sistemi eklememeli.
- Simulation logic'i UI içine koymamalı.
- Gerçek network davranışlarını mümkün olduğunca ayrı domain modelleriyle implement etmelidir.

İlk hedef **küçük ama gerçekten çalışan bir network simulation core** oluşturmaktır.
