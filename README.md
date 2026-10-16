# ROADSTER / FLIGHT LAB

An English-language browser game inspired by the Tesla Roadster Rocket concept, built with Next.js and Three.js.

Play at [roadster-flight-lab.oxog.dev](https://roadster-flight-lab.oxog.dev).

The home screen opens with actual Tesla Roadster photography, with front and side photo choices. **Watch Tesla footage** opens the official design film and ramp demonstration in an embedded player. Images and videos are credited to Tesla. Choose **Explore 3D simulator** to inspect the game model, or **Start flying** to play.

An independent fan project made for fun. Not affiliated with, endorsed by, or sponsored by Tesla, Inc. Created by [@ersinkoc](https://x.com/ersinkoc).

## Run locally

```sh
bun install --frozen-lockfile
bun run dev
```

Open the Local URL printed in the terminal. Next.js uses the next available port when port 3000 is occupied.

```sh
bun run test
bun run typecheck
bun run build
```

The production build exports static files to `out/`. Serve that folder with any static web server to preview production locally.

## Deployment

Pushes to `main` run tests, type checking, and the static build before deploying to GitHub Pages through `.github/workflows/pages.yml`. The Pages custom domain is `roadster-flight-lab.oxog.dev`; `public/CNAME` keeps that address in the exported artifact. Its DNS CNAME points to `ersinkoc.github.io`.

Stable versions checked against the npm registry on October 16, 2026: Next.js 16.4.2, React 19.3.1, Three.js 0.186.1, React Three Fiber 9.8.2, and Drei 10.7.9. Rendering uses WebGL.

## Controls and objectives

- W / Up: accelerate. S / Down: brake. A and D / Left and Right: steer.
- Hold SPACE to climb; release it to descend under gravity. CTRL descends faster.
- SHIFT: boost. Q: barrel roll above 8 meters (costs 10 pressure; awards 250 points on completion).
- C: change camera. R: reset flight. ESC: pause or resume.
- On the home screen, drag the 3D scene to inspect the car and scroll to zoom. Flight restores the gameplay camera.
- On mobile, hold the corresponding on-screen controls.
- Approach the runway ramp at speed for automatic liftoff. Fly through the rings in order, then land gently on the H pad below 18 km/h. A hard landing ends the flight.
- Lift and boost consume pressure. Pressure recharges on the ground. All telemetry represents gameplay values.
- Automatic landing assistance watches clearance above the ground or training ramp and descent speed. When needed, it spends pressure on lift and corrective jets to slow the fall and level the body. The HUD shows when it is firing, with the same white vapor and optional pneumatic sound as manual thrust. An empty tank or an unrecoverable last-second fall can still crash.
- Five courses, free flight, four body colors, three cameras, and three graphics settings are available. Global and per-course best scores and graphics quality are stored locally in the browser.
- **Ramp ride** is the default mode. **Start ramp ride**, **One-click ramp ride**, and the navigation shortcut start a live assisted ride after a three-second countdown. The car automatically accelerates into the curve, stays aligned, flips, recovers and brakes for landing. No input is needed. The assisted simulation uses bounded physics substeps to preserve timing at lower frame rates. Choose **Manual drive** before starting to control the approach yourself: hold W / Accelerate straight ahead, leave SPACE / Fly released, and reach 87 km/h before the curve; brake with S after the flip. **Watch stunt replay** remains a separate demonstration.
- **Missions** starts a selected ring course on its runway; **Free roam** starts on the east apron with no rings, timer or landing target. They share the test range. **Go to ramp ride** in either mode immediately returns to an assisted ramp start.
- Air Slalom has seven alternating rings. Pass inside the small center ring to build a combo up to five, earn 200 extra points per combo step, and recover 6 pressure. Passes above 126 km/h add another 100 points. An off-center pass breaks the combo. Gold requires at least five perfect passes and a finish under 82.5 seconds; Silver requires three perfect passes. Every successful landing earns at least Bronze.
- The challenge HUD tracks rings, perfect passes and the current combo. A dashed flight line guides the route; the finish screen awards a medal and offers the next course.
- Daylight is the default for clearer vehicle detail. Settings retain night mode. Higher graphics settings improve pixel density and shadows; photo textures use anisotropic filtering, and the wheels and grille include additional 3D trim.
- Select **Enable air bursts** to hear short pneumatic valve releases during lift, boost, and attitude control. Driving alone is silent. The same sound is available during the home-screen thruster demo; there is no engine hum.

## Research and visual references

Sources inspected on October 16, 2026:

1. [Tesla’s official Roadster page](https://www.tesla.com/roadster): Ano White body, gold-tinted glass, hidden aerodynamics, suction system, and cold-gas thrusters. Performance, Thrust, and Rocket have different equipment. Flight capability is associated with Rocket, which is not approved for public road use.
2. [Tesla — Roadster | The Last Best Driver’s Car](https://www.youtube.com/watch?v=cvKIR-c1SsU): official design video on the verified Tesla channel.
3. [Tesla — The Ramp | Roadster](https://www.youtube.com/watch?v=7p5LxFdc-Qg): official ramp demonstration on the verified Tesla channel.
4. [Benzinga — Roadster demonstration, October 16, 2026](https://www.benzinga.com/markets/tech/26/10/62403013/elon-musk-unveils-tesla-roadster-that-can-fly-drive-upside-down-and-barrel-roll-with-spacex-thrusters): reporting on Musk’s flight-video post and the October 15 event. The account, text, and date of [Musk’s original X post](https://x.com/elonmusk/status/2110913107094606330) were also checked directly. The X player returned a media error; visual inspection used the official Tesla YouTube video.
5. [NDTV — demonstration coverage](https://www.ndtv.com/offbeat/flying-car-tesla-roadster-flies-drives-upside-down-in-jaw-dropping-demo-watch-12192925): compared in news search results. The web reader could not open the full article.

The car is modeled with Three.js geometry created for this project. The official photo in the sources dialog loads from Tesla’s CDN. Google Fonts and the reference photo require network access; the 3D scene does not download external models or textures.

The in-game body is reconstructed against the white flight-demonstration Roadster's front and side photographs. The silhouette includes the lower door shoulder, separate windshield and side-window foot, longer roof and tapered rear quarter. Side paint, front fascia, alloy wheel faces and triangular lenses sample the existing official photographs through bounded UV regions. A material shader lifts the side photograph's studio shadows before applying the chosen paint color. Tires, wheel depth, body, glazing and thruster hardware remain 3D. The rear fan assembly tucks inside the tail. Desktop front, side and rear inspection presets show the silhouette, and `?view=3d` opens that preview directly. This remains an original visual reconstruction from the reference photos, not Tesla engineering CAD.

This is a fan-made arcade interpretation, not an official product or a Tesla/SpaceX partnership. Extended flight, pressure recharge, courses, speeds, time limits, and rewards are game mechanics. It is not an engineering simulation, and reported vehicle performance claims are not presented as measurements made by this game.

## Thruster visualization

Tesla’s official Roadster-06-Gravity and Roadster-03-Carousel-Slide-2 close-ups informed the four horizontal rear outlets, four fan ducts, and rising rear wing. Four underside lift thrusters and two lateral control outlets share one placement definition with their visual effects. Model coordinates are not published engineering dimensions; front and side details are visual reconstructions.

Gas is rendered with a narrow jet core, white vapor particles, and a cloud that spreads outward on ground contact. Boost fires the rear outlets, lift fires the underside outlets, and turning fires lateral outlets. Particle pools are bounded at 650 / 1400 / 2200 particles by quality level. Demo night is the default; select Settings > Scene lighting for daylight. The automatic thruster demonstration on the home screen can be stopped.

## Verification

The flight tests cover acceleration, ramp liftoff, pressure consumption and recharge, an empty tank, hard and soft landings, ordered ring crossings, completion requirements, time and area limits, frame-time bounds, and barrel rolls. Thruster tests cover emission direction, boost selection, pressure scaling, lateral control, and inactive or terminal states.

Earlier desktop browser checks exercised acceleration, ramp liftoff, the first two rings, hard landing, and retry. Full five-ring mission completion was checked through unit tests, not a complete manual playthrough. Graphics quality, camera, paint, source dialogs, and the night demonstration were also inspected in the browser.

## Inverted stunt course and replay

Select **Stunt ramp** and start flying to drive the course, or select **Watch stunt replay** for a seekable recording generated by the same flight simulation. The replay is not counted toward personal bests. Use its timeline to inspect the inverted climb, aerial rotation, stabilized attitude, and landing. Resume playback with the play button after seeking.

The separate stunt lane is centered at x = -36 meters. Hold W and approach above 87 km/h. Fan suction keeps the vehicle on a 36-meter-high curved overhang; it releases at the top, completes its rotation, then uses pressure-limited lift bursts to slow the descent. Brake with S to line up with the H pad. The three original ring courses retain their training ramp and controls.

Roads support the wheels, and ramp structures have solid collision volumes. Hitting the curved deck, its underside, rails, ribs, support posts, or the training ramp's side and rear stops the car and ends the run. Normal approaches and landings use the driving surface. The automatic flip waits briefly for clearance past the overhang lip. Building walls and roof edges are also solid.

The body was rebuilt against Tesla’s official front and side photos with wheel-well cutouts, a longer windshield, integrated fenders, triangular headlights, and split five-spoke wheels. Vapor uses white RGB, no scene fog, and bounded finite opacity. A reproduced lifetime-overrun bug previously sent NaN opacity into the shader; the regression fails before the fix and passes afterward. Browser checks inspect the inverted and recovery phases; the full stunt sequence and landing are also exercised in tests.
