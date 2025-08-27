import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, cubeGroup, controls;

const CUBIE_SIZE = 1;
const CUBIE_GAP = 0.1;
const CUBE_DIMENSION = 3;
const HALF_CUBE = Math.floor(CUBE_DIMENSION / 2);
const POSITION_OFFSET = CUBIE_SIZE + CUBIE_GAP;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(4, 4, 4);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('app-container').prepend(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    createCube();
    setupUI();

    window.addEventListener('resize', onWindowResize);
    animate();
}

function createCube() {
    if (cubeGroup) {
        scene.remove(cubeGroup);
    }
    cubeGroup = new THREE.Group();

    const colors = {
        right: new THREE.MeshStandardMaterial({ color: 0xff0000 }), // Red
        left: new THREE.MeshStandardMaterial({ color: 0xffa500 }), // Orange
        top: new THREE.MeshStandardMaterial({ color: 0xffffff }), // White
        bottom: new THREE.MeshStandardMaterial({ color: 0xffff00 }), // Yellow
        front: new THREE.MeshStandardMaterial({ color: 0x0000ff }), // Blue
        back: new THREE.MeshStandardMaterial({ color: 0x00ff00 }), // Green
        inner: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
    };

    const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);

    for (let x = -HALF_CUBE; x <= HALF_CUBE; x++) {
        for (let y = -HALF_CUBE; y <= HALF_CUBE; y++) {
            for (let z = -HALF_CUBE; z <= HALF_CUBE; z++) {
                if (x === 0 && y === 0 && z === 0 && CUBE_DIMENSION % 2 !== 0) continue;

                const materials = [
                    x === HALF_CUBE ? colors.right : colors.inner,
                    x === -HALF_CUBE ? colors.left : colors.inner,
                    y === HALF_CUBE ? colors.top : colors.inner,
                    y === -HALF_CUBE ? colors.bottom : colors.inner,
                    z === HALF_CUBE ? colors.front : colors.inner,
                    z === -HALF_CUBE ? colors.back : colors.inner,
                ];

                const cubie = new THREE.Mesh(geometry, materials);
                cubie.position.set(x * POSITION_OFFSET, y * POSITION_OFFSET, z * POSITION_OFFSET);
                cubeGroup.add(cubie);
            }
        }
    }
    scene.add(cubeGroup);
}

function setupUI() {
    const shuffleButton = document.getElementById('shuffle-btn') as HTMLButtonElement;
    const resetButton = document.getElementById('reset-btn') as HTMLButtonElement;

    shuffleButton.onclick = async () => {
        shuffleButton.disabled = true;
        resetButton.disabled = true;
        await shuffleCube();
        shuffleButton.disabled = false;
        resetButton.disabled = false;
    };

    resetButton.onclick = () => {
        if (shuffleButton.disabled) return;
        resetCube();
    };
}

async function shuffleCube() {
    const moves = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const numMoves = 25;

    for (let i = 0; i < numMoves; i++) {
        const move = moves[Math.floor(Math.random() * moves.length)];
        const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
        await performMove(move + modifier);
    }
}

function performMove(move: string) {
    return new Promise<void>(resolve => {
        const face = move[0];
        const isPrime = move.includes("'");
        const isDouble = move.includes("2");
        
        const axis = new THREE.Vector3();
        let cubiesToRotate: THREE.Mesh[] = [];
        let angleDirection = 1;

        const layerPosition = HALF_CUBE * POSITION_OFFSET;

        switch(face) {
            case 'U': axis.set(0, 1, 0); cubiesToRotate = getCubiesByPosition('y', layerPosition); angleDirection = -1; break;
            case 'D': axis.set(0, 1, 0); cubiesToRotate = getCubiesByPosition('y', -layerPosition); angleDirection = 1; break;
            case 'R': axis.set(1, 0, 0); cubiesToRotate = getCubiesByPosition('x', layerPosition); angleDirection = -1; break;
            case 'L': axis.set(1, 0, 0); cubiesToRotate = getCubiesByPosition('x', -layerPosition); angleDirection = 1; break;
            case 'F': axis.set(0, 0, 1); cubiesToRotate = getCubiesByPosition('z', layerPosition); angleDirection = -1; break;
            case 'B': axis.set(0, 0, 1); cubiesToRotate = getCubiesByPosition('z', -layerPosition); angleDirection = 1; break;
        }

        let totalAngle = (Math.PI / 2) * angleDirection;
        if (isPrime) totalAngle *= -1;
        if (isDouble) totalAngle *= 2;
        
        const animationDuration = 200; // ms
        const startTime = performance.now();
        const pivot = new THREE.Object3D();
        scene.add(pivot);
        cubiesToRotate.forEach(cubie => pivot.attach(cubie));

        let lastAngle = 0;

        function animateRotation() {
            const elapsedTime = performance.now() - startTime;
            const progress = Math.min(elapsedTime / animationDuration, 1);
            const currentAngle = totalAngle * progress;

            pivot.rotateOnWorldAxis(axis, currentAngle - lastAngle);
            lastAngle = currentAngle;

            if (progress < 1) {
                requestAnimationFrame(animateRotation);
            } else {
                // Animation finished
                pivot.updateMatrixWorld(true);

                cubiesToRotate.forEach(cubie => {
                    cubeGroup.attach(cubie); // This preserves world transform
                    // Snap position to grid
                    cubie.position.set(
                        Math.round(cubie.position.x / POSITION_OFFSET) * POSITION_OFFSET,
                        Math.round(cubie.position.y / POSITION_OFFSET) * POSITION_OFFSET,
                        Math.round(cubie.position.z / POSITION_OFFSET) * POSITION_OFFSET
                    );
                    // Snap rotation to nearest 90 degrees
                    const euler = new THREE.Euler().setFromQuaternion(cubie.quaternion, 'XYZ');
                    cubie.quaternion.setFromEuler(new THREE.Euler(
                        Math.round(euler.x / (Math.PI / 2)) * (Math.PI / 2),
                        Math.round(euler.y / (Math.PI / 2)) * (Math.PI / 2),
                        Math.round(euler.z / (Math.PI / 2)) * (Math.PI / 2)
                    ));
                });

                scene.remove(pivot);
                resolve();
            }
        }
        
        requestAnimationFrame(animateRotation);
    });
}

function getCubiesByPosition(axis: 'x' | 'y' | 'z', value: number): THREE.Mesh[] {
    return cubeGroup.children.filter(
        (c) => Math.abs(c.position[axis] - value) < 0.01
    ) as THREE.Mesh[];
}

function resetCube() {
    createCube();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();