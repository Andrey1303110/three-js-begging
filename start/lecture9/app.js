import * as THREE from 'three';
import { OrbitControls } from '../../libs/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '../../libs/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from '../../libs/three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from '../../libs/three/examples/jsm/loaders/RGBELoader.js';
import { LoadingBar } from '../../libs/LoadingBar.js';

export class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
		this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
		this.camera.position.set( 0, 0.05, 0.22 );
        
		this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0xaaaaaa );
        
		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.5);
		this.scene.add(ambient);
        
        const light = new THREE.DirectionalLight( 0xFFFFFF, 4 );
        light.position.set( 0.2, 1, 1);
        this.scene.add(light);
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        container.appendChild( this.renderer.domElement );
		this.setEnvironment();
		
        this.loadingBar = new LoadingBar();
        this.loadGLTF();

        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.target.y = 0.04;
        this.controls.update();
        
        window.addEventListener('resize', this.resize.bind(this) );
        window.test = this;
	}
    
    setEnvironment(){
        const loader = new RGBELoader();
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
         
        loader.load( '../../assets/hdr/venice_sunset_1k.hdr', ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          this.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( `An error occurred setting the environment ${err.message}`);
        } );
    }
    
    loadGLTF(){
        const loader = new GLTFLoader();
        loader.setPath('../../assets/car_1/');

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('../../libs/three/examples/jsm/libs/draco/');

        loader.setDRACOLoader(dracoLoader);

        loader.load(
            'scene.gltf',
            gltf => {
                this.car = gltf.scene;
                this.car.rotation.y = Math.PI/2;
                this.car.scale.x = 0.25;
                this.car.scale.y = 0.25;
                this.car.scale.z = 0.25;
                this.car.position.x = -0.25;
                this.car.position.y = -0.5;
                this.scene.add(gltf.scene);
                this.loadingBar.visible = false;
                this.renderer.setAnimationLoop(this.render.bind(this));

                const bbox = new THREE.Box3().setFromObject(gltf.scene);
                console.log(`x min:${bbox.min.x.toFixed(2)}`);
                console.log(`y min:${bbox.min.y.toFixed(2)}`);
                console.log(`x max:${bbox.max.x.toFixed(2)}`);
                console.log(`y max:${bbox.max.y.toFixed(2)}`);
            },
            xhr => {
                this.loadingBar.progress = (xhr.loaded/xhr.total);
            },
            err => {
                console.error(err);
            }
        )
    }
    
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }
    
	render() {
        if (this.car) {
            this.car.position.z += 0.01;
        }

        this.renderer.render( this.scene, this.camera );
    }
}
